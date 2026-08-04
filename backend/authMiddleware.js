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
    const header =
      req.headers.authorization || '';

    if (
      !header.startsWith('Bearer ')
    ) {
      return res.status(401).json({
        error:
          'Authentication required.'
      });
    }

    const token =
      header.substring(7).trim();

    if (!token) {
      return res.status(401).json({
        error:
          'Authentication token missing.'
      });
    }

    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      );

    req.user = decoded;

    next();

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

module.exports = {
  requireAuth
};
