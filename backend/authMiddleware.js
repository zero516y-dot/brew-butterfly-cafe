const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const header = req.get('Authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    req.user = jwt.verify(match[1], process.env.JWT_SECRET);
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired admin token.' });
  }
}

module.exports = { requireAuth };
