const jwt = require('jsonwebtoken');

/**
 * Verifies the Bearer token on the Authorization header and attaches
 * the decoded payload ({ userId, role, email }) to req.user.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication token missing' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired, please log in again' });
    }
    return res.status(401).json({ message: 'Invalid authentication token' });
  }
}

/**
 * Restricts a route to one or more roles, e.g. authorize('admin')
 * Must be used after `authenticate`.
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' });
    }
    next();
  };
}

function requireSuperAdmin(req, res, next) {
  const pool = require('../config/db');
  pool.query('SELECT is_super_admin FROM users WHERE user_id = $1', [req.user.userId])
    .then((result) => {
      if (!result.rows[0]?.is_super_admin) {
        return res.status(403).json({ message: 'This action requires super-administrator privileges' });
      }
      next();
    })
    .catch((err) => {
      console.error('requireSuperAdmin check failed:', err);
      res.status(500).json({ message: 'Could not verify permissions' });
    });
}

module.exports = { authenticate, authorize, requireSuperAdmin };