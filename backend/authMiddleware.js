/* ==========================================================================
   BREW BUTTERFLY CAFE — JWT AUTHENTICATION MIDDLEWARE
   ========================================================================== */

const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  // Accept token from Authorization header OR cookie
  let token =
    (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null) ||
    (req.cookies && req.cookies.admin_token) ||
    null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired — please log in again' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { requireAuth };
