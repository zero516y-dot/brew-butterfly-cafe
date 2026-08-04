/* ==========================================================================
   BREW BUTTERFLY CAFE — JWT AUTH MIDDLEWARE
   ========================================================================== */

require('dotenv').config();

const jwt = require('jsonwebtoken');

function requireAuth(
  req,
  res,
  next
) {
  try {
    const authHeader =
      req.headers.authorization || '';

    if (
      !authHeader.startsWith('Bearer ')
    ) {
      return res.status(401).json({
        error:
          'Authentication required.'
      });
    }

    const token =
      authHeader
        .slice(7)
        .trim();

    if (!token) {
      return res.status(401).json({
        error:
          'Authentication token missing.'
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
