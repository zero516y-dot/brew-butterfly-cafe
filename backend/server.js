/* ==========================================================================
   BREW BUTTERFLY CAFE — SECURE EXPRESS BACKEND & ROUTING HARDENING
   Node.js + Express | SQLite | JWT Auth | Gmail SMTP | CSRF Protection
   ========================================================================== */

require('dotenv').config();

const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const jwt        = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path       = require('path');
const fs         = require('fs');

const { reservationHelpers, menuHelpers, userHelpers } = require('./db');
const { sendReservationEmail, verifySmtp } = require('./email');
const { requireAuth } = require('./authMiddleware');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Validate required env vars on startup ─────────────────────────────────────
const REQUIRED_ENV = ['JWT_SECRET', 'SMTP_USER', 'SMTP_PASS'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`[STARTUP] Missing required env vars: ${missing.join(', ')}`);
  console.error('[STARTUP] Edit backend/.env and restart.');
  process.exit(1);
}

// ── Security Headers (Helmet) ─────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "'unsafe-inline'"],
      styleSrc:    ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc:      ["'self'", 'data:', 'https:'],
      connectSrc:  ["'self'", "http://localhost:3000", "http://127.0.0.1:3000"],
      fontSrc:     ["'self'", 'https://fonts.gstatic.com'],
      frameSrc:    ["'self'", "https://maps.google.com", "https://www.google.com", "https://google.com"],
      objectSrc:   ["'none'"],
      frameAncestors: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// ── CORS — only allow trusted origins ────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'http://localhost',
  'http://127.0.0.1',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'null'
];
app.use(cors({
  origin(origin, cb) {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));

// ── Body Parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

// ── Rate Limiters ─────────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 min
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please slow down.' }
});

const reserveLimiter = rateLimit({
  windowMs: 60 * 1000,         // 1 min
  max: 5,
  message: { error: 'Too many reservation attempts. Please wait a minute.' }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts. Try again later.' }
});

app.use(generalLimiter);

// ── CSRF Token Middleware ─────────────────────────────────────────────────────
const csrfTokens = new Map();

function issueCsrf(req, res, next) {
  const ip = req.ip || 'unknown';
  const existing = csrfTokens.get(ip);
  let token;
  if (existing && Date.now() - existing.ts < 3600_000) {
    token = existing.token;
  } else {
    token = uuidv4();
    csrfTokens.set(ip, { token, ts: Date.now() });
  }
  res.setHeader('X-CSRF-Token', token);
  req._csrfToken = token;
  next();
}

function verifyCsrf(req, res, next) {
  if (req.path.startsWith('/api/admin/')) return next();
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();

  const clientToken = req.headers['x-csrf-token'];
  const serverToken = (csrfTokens.get(req.ip || 'unknown') || {}).token;
  if (!clientToken || clientToken !== serverToken) {
    return res.status(403).json({ error: 'CSRF token mismatch or invalid request' });
  }
  next();
}

app.use(issueCsrf);

// ── Route /admin to serve admin.html securely ─────────────────────────────────
const FRONTEND_DIR = path.join(__dirname, '..');

app.get('/admin', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'admin.html'));
});

// Protect direct access to /admin.html by redirecting to /admin or 404
app.get('/admin.html', (req, res) => {
  res.redirect(301, '/admin');
});

// Serve public static assets
app.use(express.static(FRONTEND_DIR, { index: 'index.html' }));

// =============================================================================
// API ROUTES
// =============================================================================

// ── GET /api/csrf-token ───────────────────────────────────────────────────────
app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: req._csrfToken });
});

// ── POST /api/admin/login ─────────────────────────────────────────────────────
app.post('/api/admin/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const user = userHelpers.findByUsername(username.trim());
  if (!user || !userHelpers.validatePassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  res.json({ token, username: user.username, role: user.role });
});

// ── POST /api/admin/change-password ──────────────────────────────────────────
const bcrypt = require('bcryptjs');
app.post('/api/admin/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  }
  const user = userHelpers.findByUsername(req.user.username);
  if (!user || !userHelpers.validatePassword(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }
  const { db } = require('./db');
  const hash = await bcrypt.hash(newPassword, 12);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);
  res.json({ message: 'Password changed successfully.' });
});

// ── POST /api/reserve ─────────────────────────────────────────────────────────
app.post('/api/reserve', reserveLimiter, verifyCsrf, async (req, res) => {
  const { name, phone, guests, date, time, occasion, notes } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: 'A valid guest name is required.' });
  }
  if (!phone || typeof phone !== 'string' || !/^\+?[\d\s\-]{7,15}$/.test(phone.trim())) {
    return res.status(400).json({ error: 'A valid phone number is required.' });
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'A valid date (YYYY-MM-DD) is required.' });
  }
  if (!time || typeof time !== 'string' || time.trim().length < 2) {
    return res.status(400).json({ error: 'A valid time slot is required.' });
  }
  const guestCount = Math.max(1, Math.min(50, parseInt(guests, 10) || 2));

  const sanitize = s => String(s || '').trim().slice(0, 500).replace(/[<>]/g, '');

  const reservation = {
    id: 'BBC-' + Math.floor(100000 + Math.random() * 900000),
    name: sanitize(name),
    phone: sanitize(phone),
    guests: guestCount,
    date: date,
    time: sanitize(time),
    occasion: sanitize(occasion) || 'Regular Visit',
    notes: sanitize(notes),
    status: 'Pending'
  };

  try {
    reservationHelpers.create(reservation);
  } catch (err) {
    console.error('[RESERVE] DB error:', err.message);
    return res.status(500).json({ error: 'Could not save reservation. Please try again.' });
  }

  sendReservationEmail(reservation).then(result => {
    if (result.success) reservationHelpers.markEmailSent(reservation.id);
  });

  res.status(201).json({
    status: 'ok',
    reservationId: reservation.id,
    message: 'Your table has been reserved! Confirmation email dispatched.'
  });
});

// ── GET /api/menu ─────────────────────────────────────────────────────────────
app.get('/api/menu', (req, res) => {
  try {
    const items = menuHelpers.getAll();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch menu.' });
  }
});

// ── GET /api/admin/stats ──────────────────────────────────────────────────────
app.get('/api/admin/stats', requireAuth, (req, res) => {
  res.json({
    totalReservations: reservationHelpers.count(),
    pendingReservations: reservationHelpers.countPending(),
    totalMenuItems: menuHelpers.count()
  });
});

// ── GET /api/admin/reservations ───────────────────────────────────────────────
app.get('/api/admin/reservations', requireAuth, (req, res) => {
  res.json(reservationHelpers.getAll());
});

// ── PATCH /api/admin/reservations/:id ────────────────────────────────────────
app.patch('/api/admin/reservations/:id', requireAuth, (req, res) => {
  const { status } = req.body;
  const VALID = ['Pending', 'Confirmed', 'Cancelled', 'Completed'];
  if (!VALID.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value.' });
  }
  const updated = reservationHelpers.updateStatus(req.params.id, status);
  if (!updated) return res.status(404).json({ error: 'Reservation not found.' });
  res.json(updated);
});

// ── DELETE /api/admin/reservations/:id ───────────────────────────────────────
app.delete('/api/admin/reservations/:id', requireAuth, (req, res) => {
  res.json(reservationHelpers.delete(req.params.id));
});

// ── GET /api/admin/menu ───────────────────────────────────────────────────────
app.get('/api/admin/menu', requireAuth, (req, res) => {
  res.json(menuHelpers.getAll());
});

// ── POST /api/admin/menu ──────────────────────────────────────────────────────
app.post('/api/admin/menu', requireAuth, (req, res) => {
  const { cat, name, price, desc, photo, veg, featured, inStock } = req.body;
  if (!cat || !name || price == null) {
    return res.status(400).json({ error: 'cat, name and price are required.' });
  }
  const item = {
    id: 'm-' + Date.now(),
    cat: String(cat).trim(),
    name: String(name).trim().slice(0, 200),
    price: parseFloat(price),
    desc: String(desc || '').trim().slice(0, 500),
    photo: String(photo || '').trim(),
    veg: !!veg,
    featured: !!featured,
    inStock: inStock !== false
  };
  res.status(201).json(menuHelpers.upsert(item));
});

// ── PUT /api/admin/menu/:id ───────────────────────────────────────────────────
app.put('/api/admin/menu/:id', requireAuth, (req, res) => {
  const existing = menuHelpers.getById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Menu item not found.' });
  const updated = { ...existing, ...req.body, id: req.params.id };
  res.json(menuHelpers.upsert(updated));
});

// ── PATCH /api/admin/menu/:id/toggle-stock ────────────────────────────────────
app.patch('/api/admin/menu/:id/toggle-stock', requireAuth, (req, res) => {
  const item = menuHelpers.toggleStock(req.params.id);
  if (!item) return res.status(404).json({ error: 'Menu item not found.' });
  res.json(item);
});

// ── DELETE /api/admin/menu/:id ────────────────────────────────────────────────
app.delete('/api/admin/menu/:id', requireAuth, (req, res) => {
  res.json(menuHelpers.delete(req.params.id));
});

// ── POST /api/admin/menu/sync ─────────────────────────────────────────────────
app.post('/api/admin/menu/sync', requireAuth, (req, res) => {
  const items = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'Expected an array of menu items.' });
  const results = items.map(item => menuHelpers.upsert(item));
  res.json({ synced: results.length });
});

// ── Catch-all 404 for API ─────────────────────────────────────────────────────
app.use('/api', (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
});

// ── SPA fallback: serve index.html ────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`\n🦋 Brew Butterfly Cafe Backend`);
  console.log(`   → Server listening on http://localhost:${PORT}`);
  console.log(`   → Admin Endpoint: /admin (Secured by JWT)`);
  console.log(`   → Public API: /api/menu, /api/reserve`);
  console.log('');
  await verifySmtp();
});

module.exports = app;
