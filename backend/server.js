/* ==========================================================================
   BREW BUTTERFLY CAFE — PRODUCTION EXPRESS BACKEND

   Frontend : Vercel
   Backend  : Render
   Database : PostgreSQL
   Email    : Gmail SMTP
   ========================================================================== */

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const db = require('./db');

const {
  pool,
  initDatabase,
  testDatabase,
  reservationHelpers,
  menuHelpers,
  userHelpers
} = db;

const {
  sendReservationEmail,
  verifySmtp
} = require('./email');

const {
  requireAuth
} = require('./authMiddleware');

const app = express();

/* ==========================================================================
   CONFIG
   ========================================================================== */

const PORT =
  Number(process.env.PORT) || 10000;

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  'https://brew-butterfly-cafe.vercel.app';

const BACKEND_URL =
  process.env.BACKEND_URL ||
  'https://brew-butterfly-cafe-1.onrender.com';

const NODE_ENV =
  process.env.NODE_ENV ||
  'production';

/* ==========================================================================
   REQUIRED ENVIRONMENT VARIABLES
   ========================================================================== */

const REQUIRED_ENV = [
  'DATABASE_URL',
  'JWT_SECRET',
  'ADMIN_PASSWORD',
  'SMTP_USER',
  'SMTP_PASS'
];

const missing = REQUIRED_ENV.filter(
  key => !process.env[key]
);

if (missing.length > 0) {
  throw new Error(
    `[STARTUP] Missing environment variables: ${missing.join(', ')}`
  );
}

if (process.env.JWT_SECRET.length < 32) {
  throw new Error(
    '[STARTUP] JWT_SECRET must contain at least 32 characters.'
  );
}

if (process.env.ADMIN_PASSWORD.length < 8) {
  throw new Error(
    '[STARTUP] ADMIN_PASSWORD must contain at least 8 characters.'
  );
}

/* ==========================================================================
   TRUST RENDER PROXY
   ========================================================================== */

app.set('trust proxy', 1);

/* ==========================================================================
   SECURITY
   ========================================================================== */

app.use(
  helmet({
    contentSecurityPolicy: false,

    hsts:
      NODE_ENV === 'production'
        ? {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
          }
        : false,

    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin'
    }
  })
);

/* ==========================================================================
   CORS
   ========================================================================== */

const ALLOWED_ORIGINS = [
  FRONTEND_URL,

  'https://brew-butterfly-cafe.vercel.app',

  'http://localhost',
  'http://127.0.0.1',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5500',
  'http://127.0.0.1:5500'
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      console.warn(
        `[CORS] Blocked origin: ${origin}`
      );

      return callback(
        new Error('CORS origin not allowed.')
      );
    },

    credentials: true,

    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS'
    ],

    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-CSRF-Token'
    ]
  })
);

/* ==========================================================================
   BODY PARSERS
   ========================================================================== */

app.use(
  express.json({
    limit: '100kb'
  })
);

app.use(
  express.urlencoded({
    extended: false,
    limit: '100kb'
  })
);

/* ==========================================================================
   RATE LIMITERS
   ========================================================================== */

const generalLimiter =
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,

    message: {
      error:
        'Too many requests. Please slow down.'
    }
  });

const reserveLimiter =
  rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,

    message: {
      error:
        'Too many reservation attempts. Please wait a minute.'
    }
  });

const loginLimiter =
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,

    message: {
      error:
        'Too many login attempts. Try again later.'
    }
  });

app.use(generalLimiter);

/* ==========================================================================
   CSRF
   ========================================================================== */

const CSRF_SECRET =
  process.env.CSRF_SECRET ||
  process.env.JWT_SECRET;

function base64url(value) {
  return Buffer
    .from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function createCsrfToken() {
  const timestamp =
    Date.now().toString();

  const nonce =
    crypto.randomBytes(24);

  const nonceEncoded =
    base64url(nonce);

  const payload =
    `${timestamp}.${nonceEncoded}`;

  const signature =
    crypto
      .createHmac(
        'sha256',
        CSRF_SECRET
      )
      .update(payload)
      .digest('hex');

  return `${payload}.${signature}`;
}

function verifyCsrfToken(token) {
  if (
    !token ||
    typeof token !== 'string'
  ) {
    return false;
  }

  const parts = token.split('.');

  if (parts.length !== 3) {
    return false;
  }

  const [
    timestamp,
    nonce,
    signature
  ] = parts;

  const timestampNumber =
    Number(timestamp);

  if (
    !Number.isFinite(
      timestampNumber
    )
  ) {
    return false;
  }

  const age =
    Date.now() -
    timestampNumber;

  if (
    age < 0 ||
    age > 60 * 60 * 1000
  ) {
    return false;
  }

  const payload =
    `${timestamp}.${nonce}`;

  const expected =
    crypto
      .createHmac(
        'sha256',
        CSRF_SECRET
      )
      .update(payload)
      .digest('hex');

  if (
    expected.length !==
    signature.length
  ) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}

function verifyCsrf(req, res, next) {
  if (
    req.method === 'GET' ||
    req.method === 'HEAD' ||
    req.method === 'OPTIONS'
  ) {
    return next();
  }

  /*
   * Admin routes use JWT authentication.
   */
  if (
    req.path.startsWith('/api/admin/')
  ) {
    return next();
  }

  const token =
    req.headers['x-csrf-token'];

  if (!verifyCsrfToken(token)) {
    return res.status(403).json({
      error:
        'CSRF token mismatch or expired. Please refresh and try again.'
    });
  }

  next();
}

/* ==========================================================================
   HEALTH
   ========================================================================== */

app.get(
  '/api/health',
  async (req, res) => {
    try {
      const database =
        await testDatabase();

      return res.json({
        status: 'ok',

        service:
          'Brew Butterfly Cafe Backend',

        database:
          'connected',

        databaseName:
          database.database,

        frontend:
          FRONTEND_URL,

        backend:
          BACKEND_URL,

        timestamp:
          new Date().toISOString()
      });
    } catch (error) {
      console.error(
        '[HEALTH]',
        error
      );

      return res.status(503).json({
        status: 'error',
        database: 'disconnected'
      });
    }
  }
);

/* ==========================================================================
   CSRF TOKEN
   ========================================================================== */

app.get(
  '/api/csrf-token',
  (req, res) => {
    const token =
      createCsrfToken();

    res.setHeader(
      'X-CSRF-Token',
      token
    );

    return res.json({
      csrfToken: token
    });
  }
);

/* ==========================================================================
   ADMIN LOGIN
   ========================================================================== */

app.post(
  '/api/admin/login',
  loginLimiter,
  async (req, res) => {
    try {
      const {
        username,
        password
      } = req.body;

      if (
        !username ||
        !password
      ) {
        return res.status(400).json({
          error:
            'Username and password required.'
        });
      }

      const user =
        await userHelpers.findByUsername(
          username
        );

      if (!user) {
        return res.status(401).json({
          error:
            'Invalid credentials.'
        });
      }

      const valid =
        await userHelpers.validatePassword(
          password,
          user.password_hash
        );

      if (!valid) {
        return res.status(401).json({
          error:
            'Invalid credentials.'
        });
      }

      const token =
        jwt.sign(
          {
            id: user.id,
            username: user.username,
            role: user.role
          },

          process.env.JWT_SECRET,

          {
            expiresIn:
              process.env.JWT_EXPIRES_IN ||
              '8h'
          }
        );

      return res.json({
        token,

        username:
          user.username,

        role:
          user.role
      });
    } catch (error) {
      console.error(
        '[LOGIN]',
        error
      );

      return res.status(500).json({
        error:
          'Login failed. Please try again.'
      });
    }
  }
);

/* ==========================================================================
   CHANGE PASSWORD
   ========================================================================== */

app.post(
  '/api/admin/change-password',
  requireAuth,
  async (req, res) => {
    try {
      const {
        currentPassword,
        newPassword
      } = req.body;

      if (
        !currentPassword ||
        !newPassword
      ) {
        return res.status(400).json({
          error:
            'Current and new passwords are required.'
        });
      }

      if (
        typeof newPassword !== 'string' ||
        newPassword.length < 8
      ) {
        return res.status(400).json({
          error:
            'New password must be at least 8 characters.'
        });
      }

      const user =
        await userHelpers.findByUsername(
          req.user.username
        );

      if (!user) {
        return res.status(404).json({
          error:
            'User not found.'
        });
      }

      const valid =
        await userHelpers.validatePassword(
          currentPassword,
          user.password_hash
        );

      if (!valid) {
        return res.status(401).json({
          error:
            'Current password is incorrect.'
        });
      }

      const hash =
        await bcrypt.hash(
          newPassword,
          12
        );

      await userHelpers.updatePassword(
        user.id,
        hash
      );

      return res.json({
        message:
          'Password changed successfully.'
      });
    } catch (error) {
      console.error(
        '[CHANGE PASSWORD]',
        error
      );

      return res.status(500).json({
        error:
          'Could not change password.'
      });
    }
  }
);

/* ==========================================================================
   CREATE RESERVATION
   ========================================================================== */

app.post(
  '/api/reserve',
  reserveLimiter,
  verifyCsrf,
  async (req, res) => {
    const {
      name,
      phone,
      guests,
      date,
      time,
      occasion,
      notes
    } = req.body;

    /* ----------------------------------------------------------------------
       VALIDATION
       ---------------------------------------------------------------------- */

    if (
      !name ||
      typeof name !== 'string' ||
      name.trim().length < 2
    ) {
      return res.status(400).json({
        error:
          'A valid guest name is required.'
      });
    }

    if (
      !phone ||
      typeof phone !== 'string' ||
      !/^\+?[\d\s\-()]{7,20}$/.test(
        phone.trim()
      )
    ) {
      return res.status(400).json({
        error:
          'A valid phone number is required.'
      });
    }

    if (
      !date ||
      !/^\d{4}-\d{2}-\d{2}$/.test(
        date
      )
    ) {
      return res.status(400).json({
        error:
          'A valid date is required.'
      });
    }

    if (
      !time ||
      typeof time !== 'string' ||
      time.trim().length < 2
    ) {
      return res.status(400).json({
        error:
          'A valid time slot is required.'
      });
    }

    const guestCount =
      Math.max(
        1,
        Math.min(
          50,
          parseInt(
            guests,
            10
          ) || 2
        )
      );

    function sanitize(value, max = 500) {
      return String(value ?? '')
        .trim()
        .slice(0, max)
        .replace(/[<>]/g, '');
    }

    const reservation = {
      id:
        'BBC-' +
        crypto.randomInt(
          100000,
          1000000
        ),

      name:
        sanitize(name, 200),

      phone:
        sanitize(phone, 50),

      guests:
        guestCount,

      date,

      time:
        sanitize(time, 100),

      occasion:
        sanitize(
          occasion,
          200
        ) ||
        'Regular Visit',

      notes:
        sanitize(
          notes,
          500
        ),

      status:
        'Pending'
    };

    /* ----------------------------------------------------------------------
       SAVE TO DATABASE
       ---------------------------------------------------------------------- */

    try {
      await reservationHelpers.create(
        reservation
      );

      console.log(
        `[RESERVE] Saved ${reservation.id}`
      );
    } catch (error) {
      console.error(
        '[RESERVE] Database error:',
        error
      );

      return res.status(500).json({
        error:
          'Could not save reservation. Please try again.'
      });
    }

    /* ----------------------------------------------------------------------
       SEND EMAIL
       ---------------------------------------------------------------------- */

    let emailSent = false;

    try {
      const result =
        await sendReservationEmail(
          reservation
        );

      if (
        result &&
        result.success
      ) {
        emailSent = true;

        await reservationHelpers.markEmailSent(
          reservation.id
        );
      }
    } catch (error) {
      console.error(
        '[RESERVE] Email failed:',
        error
      );
    }

    /* ----------------------------------------------------------------------
       RESPONSE
       ---------------------------------------------------------------------- */

    return res.status(201).json({
      status: 'ok',

      reservationId:
        reservation.id,

      emailSent,

      message:
        'Your table has been reserved successfully.'
    });
  }
);

/* ==========================================================================
   PUBLIC MENU
   ========================================================================== */

app.get(
  '/api/menu',
  async (req, res) => {
    try {
      const items =
        await menuHelpers.getAll();

      return res.json(items);
    } catch (error) {
      console.error(
        '[MENU]',
        error
      );

      return res.status(500).json({
        error:
          'Could not fetch menu.'
      });
    }
  }
);

/* ==========================================================================
   ADMIN STATS
   ========================================================================== */

app.get(
  '/api/admin/stats',
  requireAuth,
  async (req, res) => {
    try {
      const [
        totalReservations,
        pendingReservations,
        totalMenuItems
      ] = await Promise.all([
        reservationHelpers.count(),
        reservationHelpers.countPending(),
        menuHelpers.count()
      ]);

      return res.json({
        totalReservations,
        pendingReservations,
        totalMenuItems
      });
    } catch (error) {
      console.error(
        '[ADMIN STATS]',
        error
      );

      return res.status(500).json({
        error:
          'Could not fetch statistics.'
      });
    }
  }
);

/* ==========================================================================
   ADMIN RESERVATIONS
   ========================================================================== */

app.get(
  '/api/admin/reservations',
  requireAuth,
  async (req, res) => {
    try {
      return res.json(
        await reservationHelpers.getAll()
      );
    } catch (error) {
      console.error(
        '[ADMIN RESERVATIONS]',
        error
      );

      return res.status(500).json({
        error:
          'Could not fetch reservations.'
      });
    }
  }
);

/* ==========================================================================
   UPDATE RESERVATION
   ========================================================================== */

app.patch(
  '/api/admin/reservations/:id',
  requireAuth,
  async (req, res) => {
    const {
      status
    } = req.body;

    const VALID_STATUSES = [
      'Pending',
      'Confirmed',
      'Cancelled',
      'Completed'
    ];

    if (
      !VALID_STATUSES.includes(status)
    ) {
      return res.status(400).json({
        error:
          'Invalid status value.'
      });
    }

    try {
      const updated =
        await reservationHelpers.updateStatus(
          req.params.id,
          status
        );

      if (!updated) {
        return res.status(404).json({
          error:
            'Reservation not found.'
        });
      }

      return res.json(updated);
    } catch (error) {
      console.error(
        '[UPDATE RESERVATION]',
        error
      );

      return res.status(500).json({
        error:
          'Could not update reservation.'
      });
    }
  }
);

/* ==========================================================================
   DELETE RESERVATION
   ========================================================================== */

app.delete(
  '/api/admin/reservations/:id',
  requireAuth,
  async (req, res) => {
    try {
      return res.json(
        await reservationHelpers.delete(
          req.params.id
        )
      );
    } catch (error) {
      console.error(
        '[DELETE RESERVATION]',
        error
      );

      return res.status(500).json({
        error:
          'Could not delete reservation.'
      });
    }
  }
);

/* ==========================================================================
   ADMIN MENU
   ========================================================================== */

app.get(
  '/api/admin/menu',
  requireAuth,
  async (req, res) => {
    try {
      return res.json(
        await menuHelpers.getAll()
      );
    } catch (error) {
      console.error(
        '[ADMIN MENU]',
        error
      );

      return res.status(500).json({
        error:
          'Could not fetch menu.'
      });
    }
  }
);

/* ==========================================================================
   CREATE MENU ITEM
   ========================================================================== */

app.post(
  '/api/admin/menu',
  requireAuth,
  async (req, res) => {
    const {
      cat,
      name,
      price,
      desc,
      photo,
      veg,
      featured,
      inStock
    } = req.body;

    if (
      !cat ||
      !name ||
      price == null
    ) {
      return res.status(400).json({
        error:
          'cat, name and price are required.'
      });
    }

    const numericPrice =
      Number(price);

    if (
      !Number.isFinite(
        numericPrice
      ) ||
      numericPrice < 0
    ) {
      return res.status(400).json({
        error:
          'Price must be a valid positive number.'
      });
    }

    const item = {
      id:
        `m-${crypto.randomUUID()}`,

      cat:
        String(cat)
          .trim()
          .slice(0, 100),

      name:
        String(name)
          .trim()
          .slice(0, 200),

      price:
        numericPrice,

      desc:
        String(desc || '')
          .trim()
          .slice(0, 500),

      photo:
        String(photo || '')
          .trim()
          .slice(0, 2000),

      veg:
        Boolean(veg),

      featured:
        Boolean(featured),

      inStock:
        inStock !== false
    };

    try {
      return res.status(201).json(
        await menuHelpers.upsert(item)
      );
    } catch (error) {
      console.error(
        '[CREATE MENU]',
        error
      );

      return res.status(500).json({
        error:
          'Could not create menu item.'
      });
    }
  }
);

/* ==========================================================================
   UPDATE MENU
   ========================================================================== */

app.put(
  '/api/admin/menu/:id',
  requireAuth,
  async (req, res) => {
    try {
      const existing =
        await menuHelpers.getById(
          req.params.id
        );

      if (!existing) {
        return res.status(404).json({
          error:
            'Menu item not found.'
        });
      }

      const updated = {
        ...existing,
        ...req.body,
        id:
          req.params.id
      };

      return res.json(
        await menuHelpers.upsert(
          updated
        )
      );
    } catch (error) {
      console.error(
        '[UPDATE MENU]',
        error
      );

      return res.status(500).json({
        error:
          'Could not update menu item.'
      });
    }
  }
);

/* ==========================================================================
   TOGGLE STOCK
   ========================================================================== */

app.patch(
  '/api/admin/menu/:id/toggle-stock',
  requireAuth,
  async (req, res) => {
    try {
      const item =
        await menuHelpers.toggleStock(
          req.params.id
        );

      if (!item) {
        return res.status(404).json({
          error:
            'Menu item not found.'
        });
      }

      return res.json(item);
    } catch (error) {
      console.error(
        '[TOGGLE STOCK]',
        error
      );

      return res.status(500).json({
        error:
          'Could not update stock status.'
      });
    }
  }
);

/* ==========================================================================
   DELETE MENU
   ========================================================================== */

app.delete(
  '/api/admin/menu/:id',
  requireAuth,
  async (req, res) => {
    try {
      return res.json(
        await menuHelpers.delete(
          req.params.id
        )
      );
    } catch (error) {
      console.error(
        '[DELETE MENU]',
        error
      );

      return res.status(500).json({
        error:
          'Could not delete menu item.'
      });
    }
  }
);

/* ==========================================================================
   SYNC MENU
   ========================================================================== */

app.post(
  '/api/admin/menu/sync',
  requireAuth,
  async (req, res) => {
    const items =
      req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({
        error:
          'Expected an array of menu items.'
      });
    }

    if (items.length > 500) {
      return res.status(400).json({
        error:
          'Maximum 500 menu items per sync.'
      });
    }

    try {
      const results =
        await Promise.all(
          items.map(
            item =>
              menuHelpers.upsert(item)
          )
        );

      return res.json({
        synced:
          results.length
      });
    } catch (error) {
      console.error(
        '[SYNC MENU]',
        error
      );

      return res.status(500).json({
        error:
          'Could not sync menu.'
      });
    }
  }
);

/* ==========================================================================
   API 404
   ========================================================================== */

app.use(
  '/api',
  (req, res) => {
    return res.status(404).json({
      error:
        `API route not found: ${req.method} ${req.path}`
    });
  }
);

/* ==========================================================================
   GLOBAL ERROR HANDLER
   ========================================================================== */

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      '[ERROR]',
      error
    );

    if (res.headersSent) {
      return next(error);
    }

    return res.status(
      error.status || 500
    ).json({
      error:
        NODE_ENV === 'production'
          ? 'Internal server error.'
          : error.message
    });
  }
);

/* ==========================================================================
   START SERVER
   ========================================================================== */

async function startServer() {
  console.log('');
  console.log('🦋 Brew Butterfly Cafe Backend');
  console.log('   → Starting...');

  try {
    /* ----------------------------------------------------------------------
       DATABASE
       ---------------------------------------------------------------------- */

    if (typeof initDatabase !== 'function') {
      throw new Error(
        'Database module error: initDatabase is not exported from ./db.js'
      );
    }

    if (!pool) {
      throw new Error(
        'Database module error: PostgreSQL pool is not exported from ./db.js'
      );
    }

    await initDatabase();

    console.log(
      '   → Database connected'
    );

    /* ----------------------------------------------------------------------
       SMTP
       ---------------------------------------------------------------------- */

    try {
      await verifySmtp();

      console.log(
        '   → Gmail SMTP connected'
      );
    } catch (smtpError) {
      console.error(
        '[SMTP] Verification failed:',
        smtpError.message
      );

      console.error(
        '[SMTP] Reservations will still be saved.'
      );
    }

    /* ----------------------------------------------------------------------
       HTTP SERVER
       ---------------------------------------------------------------------- */

    const server =
      app.listen(
        PORT,
        '0.0.0.0',
        () => {
          console.log(
            `   → Server listening on port ${PORT}`
          );

          console.log(
            `   → Frontend: ${FRONTEND_URL}`
          );

          console.log(
            `   → Backend: ${BACKEND_URL}`
          );

          console.log(
            '   → Database: PostgreSQL'
          );

          console.log(
            '   → Email: Gmail SMTP'
          );

          console.log(
            '   → Public API: /api/menu'
          );

          console.log(
            '   → Public API: /api/reserve'
          );

          console.log(
            '   → Admin API: /api/admin/*'
          );

          console.log('');
        }
      );

    /* ----------------------------------------------------------------------
       GRACEFUL SHUTDOWN
       ---------------------------------------------------------------------- */

    const shutdown = async (signal) => {
      console.log(
        `[SERVER] ${signal} received. Shutting down...`
      );

      server.close(async () => {
        try {
          await pool.end();

          console.log(
            '[SERVER] Database pool closed.'
          );

          process.exit(0);
        } catch (error) {
          console.error(
            '[SERVER] Shutdown error:',
            error
          );

          process.exit(1);
        }
      });
    };

    process.once(
      'SIGTERM',
      () => shutdown('SIGTERM')
    );

    process.once(
      'SIGINT',
      () => shutdown('SIGINT')
    );

  } catch (error) {
    console.error('');
    console.error(
      '❌ SERVER STARTUP FAILED'
    );

    console.error(
      error
    );

    /*
     * Never call pool.end() blindly.
     * The previous version caused:
     *
     * TypeError: Cannot read properties of undefined
     * (reading 'end')
     */

    if (
      pool &&
      typeof pool.end === 'function'
    ) {
      try {
        await pool.end();
      } catch (poolError) {
        console.error(
          '[DATABASE] Pool shutdown error:',
          poolError
        );
      }
    }

    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
