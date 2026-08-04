require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const { reservationHelpers, menuHelpers, userHelpers } = require('./db');
const { sendReservationEmail, verifySmtp } = require('./email');
const { requireAuth } = require('./authMiddleware');

const app = express();
app.set('trust proxy', 1);

const PORT = Number(process.env.PORT || 3000);
const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://brew-butterfly-cafe.vercel.app').replace(/\/$/, '');
const BACKEND_URL = (process.env.BACKEND_URL || 'https://brew-butterfly-cafe-1.onrender.com').replace(/\/$/, '');

const allowedOrigins = new Set([
  FRONTEND_URL,
  'https://brew-butterfly-cafe.vercel.app',
  'http://localhost',
  'http://127.0.0.1',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500'
]);

const required = ['JWT_SECRET', 'SMTP_USER', 'SMTP_PASS'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`[STARTUP] Missing environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      connectSrc: ["'self'", FRONTEND_URL, BACKEND_URL],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      frameSrc: ["'self'", 'https://maps.google.com', 'https://www.google.com', 'https://google.com'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"]
    }
  },
  hsts: process.env.NODE_ENV === 'production'
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    console.warn(`[CORS] Blocked origin: ${origin}`);
    return callback(new Error('CORS origin not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'X-CSRF-Token']
}));

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 300,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' }
});
const reserveLimiter = rateLimit({
  windowMs: 60 * 1000, max: 5,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many reservation attempts. Please wait a minute.' }
});
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 5,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again later.' }
});
app.use(generalLimiter);

/*
 * CSRF is deliberately tied to a client cookie rather than IP.
 * This avoids failures when Render/proxies change the observed IP.
 */
const csrfCookieName = 'bbc_csrf';
const csrfTokens = new Map();

function issueCsrf(req, res, next) {
  let token = req.cookies?.[csrfCookieName];
  if (!token) {
    token = uuidv4();
    res.cookie(csrfCookieName, token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge: 60 * 60 * 1000,
      path: '/'
    });
  }
  csrfTokens.set(token, Date.now());
  req._csrfToken = token;
  res.setHeader('X-CSRF-Token', token);
  next();
}

function verifyCsrf(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  if (req.path.startsWith('/admin')) return next();
  const clientToken = req.get('X-CSRF-Token');
  if (!clientToken || !csrfTokens.has(clientToken)) {
    return res.status(403).json({ error: 'CSRF token mismatch or expired. Refresh and try again.' });
  }
  if (Date.now() - csrfTokens.get(clientToken) > 60 * 60 * 1000) {
    csrfTokens.delete(clientToken);
    return res.status(403).json({ error: 'CSRF token expired. Refresh and try again.' });
  }
  next();
}

/* Cookie parser kept tiny to avoid another dependency. */
app.use((req, res, next) => {
  req.cookies = {};
  const raw = req.headers.cookie || '';
  raw.split(';').forEach(part => {
    const i = part.indexOf('=');
    if (i < 0) return;
    const k = decodeURIComponent(part.slice(0, i).trim());
    const v = decodeURIComponent(part.slice(i + 1).trim());
    req.cookies[k] = v;
  });
  next();
});

app.use(issueCsrf);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Brew Butterfly Cafe Backend',
    database: 'sqlite',
    smtp: 'configured',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: req._csrfToken });
});

/* Admin login does not require CSRF because it authenticates with credentials. */
app.post('/api/admin/login', loginLimiter, (req, res) => {
  try {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required.' });
    }

    const user = userHelpers.findByUsername(username);
    if (!user || !userHelpers.validatePassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    return res.json({ token, username: user.username, role: user.role });
  } catch (err) {
    console.error('[LOGIN]', err);
    return res.status(500).json({ error: 'Login failed.' });
  }
});

app.post('/api/admin/change-password', requireAuth, async (req, res) => {
  try {
    const currentPassword = String(req.body.currentPassword || '');
    const newPassword = String(req.body.newPassword || '');
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    }
    const user = userHelpers.findByUsername(req.user.username);
    if (!user || !userHelpers.validatePassword(currentPassword, user.password_hash)) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }
    const hash = await bcrypt.hash(newPassword, 12);
    userHelpers.updatePassword(user.id, hash);
    return res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('[CHANGE PASSWORD]', err);
    return res.status(500).json({ error: 'Could not change password.' });
  }
});

app.post('/api/reserve', reserveLimiter, verifyCsrf, async (req, res) => {
  const name = String(req.body.name || '').trim();
  const phone = String(req.body.phone || '').trim();
  const date = String(req.body.date || '').trim();
  const time = String(req.body.time || '').trim();
  const occasion = String(req.body.occasion || '').trim();
  const notes = String(req.body.notes || '').trim();
  const guests = Math.max(1, Math.min(50, Number.parseInt(req.body.guests, 10) || 2));

  if (name.length < 2 || name.length > 100) return res.status(400).json({ error: 'A valid guest name is required.' });
  if (!/^\+?[\d\s-]{7,20}$/.test(phone)) return res.status(400).json({ error: 'A valid phone number is required.' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'A valid date is required.' });
  if (Number.isNaN(Date.parse(`${date}T00:00:00`))) return res.status(400).json({ error: 'Invalid reservation date.' });
  if (!time) return res.status(400).json({ error: 'A valid time slot is required.' });

  const clean = value => value.slice(0, 500).replace(/[<>]/g, '');
  const reservation = {
    id: `BBC-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    name: clean(name),
    phone: clean(phone),
    guests,
    date,
    time: clean(time),
    occasion: clean(occasion) || 'Regular Visit',
    notes: clean(notes),
    status: 'Pending'
  };

  try {
    reservationHelpers.create(reservation);
  } catch (err) {
    console.error('[RESERVE] Database error:', err);
    return res.status(500).json({
      error: process.env.NODE_ENV === 'production'
        ? 'Could not save reservation. Please try again.'
        : `Database error: ${err.message}`
    });
  }

  let emailSent = false;
  try {
    const result = await sendReservationEmail(reservation);
    emailSent = !!result?.success;
    if (emailSent) reservationHelpers.markEmailSent(reservation.id);
  } catch (err) {
    console.error('[EMAIL] Reservation notification failed:', err);
  }

  return res.status(201).json({
    status: 'ok',
    reservationId: reservation.id,
    emailSent,
    message: 'Your table reservation has been received. Our team will confirm it by phone.'
  });
});

app.get('/api/menu', (req, res) => {
  try {
    return res.json(menuHelpers.getAll());
  } catch (err) {
    console.error('[MENU]', err);
    return res.status(500).json({ error: 'Could not fetch menu.' });
  }
});

app.get('/api/admin/stats', requireAuth, (req, res) => {
  try {
    return res.json({
      totalReservations: reservationHelpers.count(),
      pendingReservations: reservationHelpers.countPending(),
      totalMenuItems: menuHelpers.count()
    });
  } catch (err) {
    console.error('[ADMIN STATS]', err);
    return res.status(500).json({ error: 'Could not fetch statistics.' });
  }
});

app.get('/api/admin/reservations', requireAuth, (req, res) => {
  try {
    return res.json(reservationHelpers.getAll());
  } catch (err) {
    console.error('[ADMIN RESERVATIONS]', err);
    return res.status(500).json({ error: 'Could not fetch reservations.' });
  }
});

app.patch('/api/admin/reservations/:id', requireAuth, (req, res) => {
  try {
    const allowed = ['Pending', 'Confirmed', 'Cancelled', 'Completed'];
    const status = String(req.body.status || '');
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status value.' });
    const updated = reservationHelpers.updateStatus(req.params.id, status);
    if (!updated) return res.status(404).json({ error: 'Reservation not found.' });
    return res.json(updated);
  } catch (err) {
    console.error('[UPDATE RESERVATION]', err);
    return res.status(500).json({ error: 'Could not update reservation.' });
  }
});

app.delete('/api/admin/reservations/:id', requireAuth, (req, res) => {
  try {
    return res.json(reservationHelpers.delete(req.params.id));
  } catch (err) {
    console.error('[DELETE RESERVATION]', err);
    return res.status(500).json({ error: 'Could not delete reservation.' });
  }
});

app.get('/api/admin/menu', requireAuth, (req, res) => {
  try { return res.json(menuHelpers.getAll()); }
  catch (err) { return res.status(500).json({ error: 'Could not fetch menu.' }); }
});

app.post('/api/admin/menu', requireAuth, (req, res) => {
  try {
    const { cat, name, price, desc, photo, veg, featured, inStock } = req.body;
    const numericPrice = Number(price);
    if (!cat || !name || !Number.isFinite(numericPrice) || numericPrice < 0) {
      return res.status(400).json({ error: 'cat, name and a valid price are required.' });
    }
    const item = {
      id: `m-${Date.now()}`,
      cat: String(cat).trim(),
      name: String(name).trim().slice(0, 200),
      price: numericPrice,
      desc: String(desc || '').trim().slice(0, 500),
      photo: String(photo || '').trim(),
      veg: !!veg, featured: !!featured, inStock: inStock !== false
    };
    return res.status(201).json(menuHelpers.upsert(item));
  } catch (err) {
    console.error('[CREATE MENU]', err);
    return res.status(500).json({ error: 'Could not create menu item.' });
  }
});

app.put('/api/admin/menu/:id', requireAuth, (req, res) => {
  try {
    const existing = menuHelpers.getById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Menu item not found.' });
    return res.json(menuHelpers.upsert({ ...existing, ...req.body, id: req.params.id }));
  } catch (err) {
    console.error('[UPDATE MENU]', err);
    return res.status(500).json({ error: 'Could not update menu item.' });
  }
});

app.patch('/api/admin/menu/:id/toggle-stock', requireAuth, (req, res) => {
  try {
    const item = menuHelpers.toggleStock(req.params.id);
    if (!item) return res.status(404).json({ error: 'Menu item not found.' });
    return res.json(item);
  } catch (err) {
    return res.status(500).json({ error: 'Could not update stock status.' });
  }
});

app.delete('/api/admin/menu/:id', requireAuth, (req, res) => {
  try { return res.json(menuHelpers.delete(req.params.id)); }
  catch (err) { return res.status(500).json({ error: 'Could not delete menu item.' }); }
});

app.post('/api/admin/menu/sync', requireAuth, (req, res) => {
  try {
    if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Expected an array of menu items.' });
    const results = req.body.map(item => menuHelpers.upsert(item));
    return res.json({ synced: results.length });
  } catch (err) {
    return res.status(500).json({ error: 'Could not sync menu.' });
  }
});

app.get('/admin', (req, res) => {
  res.sendFile(require('path').join(__dirname, 'admin.html'));
});
app.get('/admin.html', (req, res) => res.redirect('/admin'));

app.use('/api', (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'Brew Butterfly Cafe Backend', api: '/api/health', admin: '/admin' });
});

app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Brew Butterfly backend listening on ${PORT}`);
  console.log(`Frontend: ${FRONTEND_URL}`);
  console.log(`Database: ${process.env.DATABASE_PATH || './data/brew-butterfly.sqlite'}`);
  try {
    await verifySmtp();
    console.log('SMTP verification completed.');
  } catch (err) {
    console.error('[SMTP] Verification failed:', err.message);
  }
});

module.exports = app;

