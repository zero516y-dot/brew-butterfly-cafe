/* ==========================================================================
   BREW BUTTERFLY CAFE — EXPRESS BACKEND
   Node.js + Express | JWT Auth | CORS | Security
   Frontend: Vercel
   Backend: Render
   ========================================================================== */

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const {
  reservationHelpers,
  menuHelpers,
  userHelpers
} = require('./db');

const {
  sendReservationEmail,
  verifySmtp
} = require('./email');

const { requireAuth } = require('./authMiddleware');

const app = express();

/* ==========================================================================
   CONFIG
   ========================================================================== */

const PORT = Number(process.env.PORT) || 3000;

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  'https://brew-butterfly-cafe.vercel.app';

/* ==========================================================================
   REQUIRED ENVIRONMENT VARIABLES
   ========================================================================== */

const REQUIRED_ENV = [
  'JWT_SECRET',
  'SMTP_USER',
  'SMTP_PASS'
];

const missing = REQUIRED_ENV.filter(
  key => !process.env[key]
);

if (missing.length > 0) {
  console.error(
    `[STARTUP] Missing required environment variables: ${missing.join(', ')}`
  );

  console.error(
    '[STARTUP] Add these variables in Render → Environment.'
  );

  process.exit(1);
}

/* ==========================================================================
   SECURITY HEADERS
   ========================================================================== */

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],

        scriptSrc: [
          "'self'",
          "'unsafe-inline'"
        ],

        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com'
        ],

        imgSrc: [
          "'self'",
          'data:',
          'https:'
        ],

        /*
         * The frontend is on Vercel and API is on Render.
         * Browser requests from the frontend to the backend are allowed.
         */
        connectSrc: [
          "'self'",
          FRONTEND_URL,
          'https://brew-butterfly-cafe-1.onrender.com'
        ],

        fontSrc: [
          "'self'",
          'https://fonts.gstatic.com'
        ],

        frameSrc: [
          "'self'",
          'https://maps.google.com',
          'https://www.google.com',
          'https://google.com'
        ],

        objectSrc: ["'none'"],

        frameAncestors: ["'none'"]
      }
    },

    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },

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

  // Production frontend
  'https://brew-butterfly-cafe.vercel.app',

  // Local development
  'http://localhost',
  'http://127.0.0.1',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500'
];

app.use(
  cors({
    origin(origin, callback) {
      /*
       * Requests without an Origin header can be allowed.
       * This includes direct browser navigation and some server-side tools.
       */
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
        new Error(`CORS: Origin ${origin} not allowed`)
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

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    error: 'Too many requests — please slow down.'
  }
});

const reserveLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    error: 'Too many reservation attempts. Please wait a minute.'
  }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    error: 'Too many login attempts. Try again later.'
  }
});

app.use(generalLimiter);

/* ==========================================================================
   CSRF PROTECTION
   ========================================================================== */

/*
 * Temporary in-memory CSRF store.
 *
 * NOTE:
 * This works for a single Render instance but is not ideal for a
 * multi-instance production environment.
 */
const csrfTokens = new Map();

function issueCsrf(req, res, next) {
  const ip = req.ip || 'unknown';

  const existing = csrfTokens.get(ip);

  let token;

  if (
    existing &&
    Date.now() - existing.ts < 3600_000
  ) {
    token = existing.token;
  } else {
    token = uuidv4();

    csrfTokens.set(ip, {
      token,
      ts: Date.now()
    });
  }

  res.setHeader(
    'X-CSRF-Token',
    token
  );

  req._csrfToken = token;

  next();
}

function verifyCsrf(req, res, next) {
  /*
   * Admin endpoints already require JWT authentication.
   */
  if (req.path.startsWith('/api/admin/')) {
    return next();
  }

  /*
   * Safe HTTP methods don't require CSRF.
   */
  if (
    req.method === 'GET' ||
    req.method === 'HEAD' ||
    req.method === 'OPTIONS'
  ) {
    return next();
  }

  const clientToken =
    req.headers['x-csrf-token'];

  const serverToken =
    (
      csrfTokens.get(req.ip || 'unknown') ||
      {}
    ).token;

  if (
    !clientToken ||
    clientToken !== serverToken
  ) {
    return res.status(403).json({
      error: 'CSRF token mismatch or invalid request'
    });
  }

  next();
}

app.use(issueCsrf);

/* ==========================================================================
   API HEALTH CHECK
   ========================================================================== */

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Brew Butterfly Cafe Backend',
    frontend: FRONTEND_URL,
    timestamp: new Date().toISOString()
  });
});

/* ==========================================================================
   CSRF TOKEN
   ========================================================================== */

app.get('/api/csrf-token', (req, res) => {
  res.json({
    csrfToken: req._csrfToken
  });
});

/* ==========================================================================
   ADMIN LOGIN
   ========================================================================== */

app.post(
  '/api/admin/login',
  loginLimiter,
  (req, res) => {
    const {
      username,
      password
    } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Username and password required'
      });
    }

    try {
      const user =
        userHelpers.findByUsername(
          username.trim()
        );

      if (
        !user ||
        !userHelpers.validatePassword(
          password,
          user.password_hash
        )
      ) {
        return res.status(401).json({
          error: 'Invalid credentials'
        });
      }

      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          role: user.role
        },

        process.env.JWT_SECRET,

        {
          expiresIn:
            process.env.JWT_EXPIRES_IN || '8h'
        }
      );

      return res.json({
        token,
        username: user.username,
        role: user.role
      });

    } catch (error) {
      console.error(
        '[LOGIN]',
        error
      );

      return res.status(500).json({
        error: 'Login failed. Please try again.'
      });
    }
  }
);

/* ==========================================================================
   ADMIN CHANGE PASSWORD
   ========================================================================== */

const bcrypt = require('bcryptjs');

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
        !newPassword ||
        newPassword.length < 8
      ) {
        return res.status(400).json({
          error:
            'New password must be at least 8 characters.'
        });
      }

      const user =
        userHelpers.findByUsername(
          req.user.username
        );

      if (
        !user ||
        !userHelpers.validatePassword(
          currentPassword,
          user.password_hash
        )
      ) {
        return res.status(401).json({
          error:
            'Current password is incorrect.'
        });
      }

      /*
       * Your existing db.js must expose an
       * updatePassword helper for this endpoint.
       */
      if (
        typeof userHelpers.updatePassword !==
        'function'
      ) {
        return res.status(501).json({
          error:
            'Password change is not configured in db.js yet.'
        });
      }

      const hash =
        await bcrypt.hash(
          newPassword,
          12
        );

      userHelpers.updatePassword(
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

    /* Validate name */
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

    /* Validate phone */
    if (
      !phone ||
      typeof phone !== 'string' ||
      !/^\+?[\d\s\-]{7,15}$/.test(
        phone.trim()
      )
    ) {
      return res.status(400).json({
        error:
          'A valid phone number is required.'
      });
    }

    /* Validate date */
    if (
      !date ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
      return res.status(400).json({
        error:
          'A valid date (YYYY-MM-DD) is required.'
      });
    }

    /* Validate time */
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
          parseInt(guests, 10) || 2
        )
      );

    const sanitize = value =>
      String(value || '')
        .trim()
        .slice(0, 500)
        .replace(/[<>]/g, '');

    const reservation = {
      id:
        'BBC-' +
        Math.floor(
          100000 +
          Math.random() * 900000
        ),

      name: sanitize(name),

      phone: sanitize(phone),

      guests: guestCount,

      date,

      time: sanitize(time),

      occasion:
        sanitize(occasion) ||
        'Regular Visit',

      notes:
        sanitize(notes),

      status: 'Pending'
    };

    try {
      reservationHelpers.create(
        reservation
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

    /*
     * Email failure should NOT delete
     * a successfully saved reservation.
     */
    try {
      const result =
        await sendReservationEmail(
          reservation
        );

      if (
        result &&
        result.success
      ) {
        try {
          reservationHelpers.markEmailSent(
            reservation.id
          );
        } catch (error) {
          console.error(
            '[RESERVE] Could not mark email sent:',
            error.message
          );
        }
      }

    } catch (error) {
      console.error(
        '[EMAIL] Reservation email failed:',
        error.message
      );
    }

    return res.status(201).json({
      status: 'ok',

      reservationId:
        reservation.id,

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
  (req, res) => {
    try {
      const items =
        menuHelpers.getAll();

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
  (req, res) => {
    try {
      return res.json({
        totalReservations:
          reservationHelpers.count(),

        pendingReservations:
          reservationHelpers.countPending(),

        totalMenuItems:
          menuHelpers.count()
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
  (req, res) => {
    try {
      return res.json(
        reservationHelpers.getAll()
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
   UPDATE RESERVATION STATUS
   ========================================================================== */

app.patch(
  '/api/admin/reservations/:id',
  requireAuth,
  (req, res) => {
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
        reservationHelpers.updateStatus(
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
  (req, res) => {
    try {
      const result =
        reservationHelpers.delete(
          req.params.id
        );

      return res.json(result);

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
  (req, res) => {
    try {
      return res.json(
        menuHelpers.getAll()
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
  (req, res) => {
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
      parseFloat(price);

    if (
      Number.isNaN(numericPrice) ||
      numericPrice < 0
    ) {
      return res.status(400).json({
        error:
          'Price must be a valid positive number.'
      });
    }

    const item = {
      id:
        'm-' +
        Date.now(),

      cat:
        String(cat)
          .trim(),

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
          .trim(),

      veg:
        !!veg,

      featured:
        !!featured,

      inStock:
        inStock !== false
    };

    try {
      return res.status(201).json(
        menuHelpers.upsert(item)
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
   UPDATE MENU ITEM
   ========================================================================== */

app.put(
  '/api/admin/menu/:id',
  requireAuth,
  (req, res) => {
    try {
      const existing =
        menuHelpers.getById(
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
        id: req.params.id
      };

      return res.json(
        menuHelpers.upsert(updated)
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
   TOGGLE MENU STOCK
   ========================================================================== */

app.patch(
  '/api/admin/menu/:id/toggle-stock',
  requireAuth,
  (req, res) => {
    try {
      const item =
        menuHelpers.toggleStock(
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
   DELETE MENU ITEM
   ========================================================================== */

app.delete(
  '/api/admin/menu/:id',
  requireAuth,
  (req, res) => {
    try {
      return res.json(
        menuHelpers.delete(
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
  (req, res) => {
    const items =
      req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({
        error:
          'Expected an array of menu items.'
      });
    }

    try {
      const results =
        items.map(item =>
          menuHelpers.upsert(item)
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
   ROOT / HEALTH RESPONSE
   ========================================================================== */

/*
 * Your frontend is hosted on Vercel.
 * Therefore Render should NOT try to serve index.html.
 */

app.get(
  '/',
  (req, res) => {
    res.json({
      status: 'ok',
      service:
        'Brew Butterfly Cafe Backend',

      frontend:
        FRONTEND_URL,

      api:
        '/api/health'
    });
  }
);

/* ==========================================================================
   GLOBAL ERROR HANDLER
   ========================================================================== */

app.use(
  (err, req, res, _next) => {
    console.error(
      '[ERROR]',
      err.message
    );

    res.status(
      err.status || 500
    ).json({
      error:
        process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : err.message
    });
  }
);

/* ==========================================================================
   START SERVER
   ========================================================================== */

app.listen(
  PORT,
  '0.0.0.0',
  async () => {
    console.log('');
    console.log(
      '🦋 Brew Butterfly Cafe Backend'
    );

    console.log(
      `   → Server listening on port ${PORT}`
    );

    console.log(
      `   → Frontend: ${FRONTEND_URL}`
    );

    console.log(
      '   → Public API: /api/menu, /api/reserve'
    );

    console.log(
      '   → Admin API: /api/admin/*'
    );

    console.log('');

    try {
      await verifySmtp();

      console.log(
        '   → SMTP verification completed'
      );

    } catch (error) {
      console.error(
        '[SMTP] Verification failed:',
        error.message
      );
    }
  }
);

module.exports = app;
