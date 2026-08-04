/* ==========================================================================
   BREW BUTTERFLY CAFE — JWT AUTH MIDDLEWARE
   ========================================================================== */

require('dotenv').config();

const jwt = require('jsonwebtoken');

function getTokenFromRequest(req) {
  const authHeader = req.headers.authorization || '';

  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  const cookieHeader = req.headers.cookie || '';

  if (!cookieHeader) {
    return '';
  }

  const cookies = Object.fromEntries(
    cookieHeader
      .split(';')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const separatorIndex = entry.indexOf('=');

        if (separatorIndex === -1) {
          return [entry, ''];
        }

        return [entry.slice(0, separatorIndex), entry.slice(separatorIndex + 1)];
      })
  );

  return cookies.bbc_admin_token || '';
}

function requireAuth(
  req,
  res,
  next
) {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({
        error:
          'Authentication required.'
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error(
        '[AUTH] JWT_SECRET is missing.'
      );

      return res.status(500).json({
        error:
          'Authentication service is not configured.'
      });
    }

    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      );

    if (
      !decoded ||
      !decoded.id ||
      !decoded.username
    ) {
      return res.status(401).json({
        error:
          'Invalid authentication token.'
      });
    }

    req.user = decoded;

    return next();

  } catch (error) {
    console.error(
      '[AUTH]',
      error.message
    );

    return res.status(401).json({
      error:
        'Invalid or expired authentication token.'
    });
  }
}

function requireAdmin(
  req,
  res,
  next
) {
  return requireAuth(
    req,
    res,
    () => {
      if (
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

module.exports = {
  requireAuth,
  requireAdmin
};

