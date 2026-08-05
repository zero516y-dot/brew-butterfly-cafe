/* ==========================================================================
   BREW BUTTERFLY CAFE — JWT AUTH MIDDLEWARE
   Supports:
   1. Authorization: Bearer <JWT>
   2. HttpOnly cookie: bbc_admin_token
   ========================================================================== */

require('dotenv').config();

const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'bbc_admin_token';

/* ==========================================================================
   GET TOKEN
   ========================================================================== */

function getTokenFromRequest(req) {
  /* ------------------------------------------------------------------------
     1. Authorization header
     ------------------------------------------------------------------------ */

  const authHeader = req.headers.authorization || '';

  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();

    if (token) {
      return token;
    }
  }

  /* ------------------------------------------------------------------------
     2. Cookie
     ------------------------------------------------------------------------ */

  const cookieHeader = req.headers.cookie || '';

  if (!cookieHeader) {
    return '';
  }

  const cookies = {};

  for (const part of cookieHeader.split(';')) {
    const separatorIndex = part.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const name = part
      .slice(0, separatorIndex)
      .trim();

    const value = part
      .slice(separatorIndex + 1)
      .trim();

    if (!name) {
      continue;
    }

    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      cookies[name] = value;
    }
  }

  return cookies[COOKIE_NAME] || '';
}

/* ==========================================================================
   VERIFY JWT
   ========================================================================== */

function verifyToken(token) {
  if (!process.env.JWT_SECRET) {
    throw new Error(
      'JWT_SECRET is not configured.'
    );
  }

  return jwt.verify(
    token,
    process.env.JWT_SECRET,
    {
      algorithms: ['HS256']
    }
  );
}

/* ==========================================================================
   AUTHENTICATION
   ========================================================================== */

function requireAuth(req, res, next) {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required.'
      });
    }

    const decoded = verifyToken(token);

    if (
      !decoded ||
      typeof decoded !== 'object' ||
      !decoded.id ||
      !decoded.username
    ) {
      return res.status(401).json({
        error: 'Invalid authentication token.'
      });
    }

    req.user = decoded;

    return next();

  } catch (error) {
    console.error(
      '[AUTH]',
      error.message
    );

    if (
      error.name === 'TokenExpiredError'
    ) {
      return res.status(401).json({
        error: 'Authentication token expired.'
      });
    }

    if (
      error.name === 'JsonWebTokenError'
    ) {
      return res.status(401).json({
        error: 'Invalid authentication token.'
      });
    }

    if (
      error.message ===
      'JWT_SECRET is not configured.'
    ) {
      return res.status(500).json({
        error:
          'Authentication service is not configured.'
      });
    }

    return res.status(401).json({
      error:
        'Authentication failed.'
    });
  }
}

/* ==========================================================================
   ADMIN AUTHENTICATION
   ========================================================================== */

function requireAdmin(req, res, next) {
  return requireAuth(
    req,
    res,
    () => {
      if (
        !req.user ||
        req.user.role !== 'admin'
      ) {
        return res.status(403).json({
          error:
            'Administrator access required.'
        });
      }

      return next();
    }
  );
}

/* ==========================================================================
   EXPORTS
   ========================================================================== */

module.exports = {
  requireAuth,
  requireAdmin,
  getTokenFromRequest
};
