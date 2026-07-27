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

/**
 * Restricts a route to super-administrators only (FR7.1). Checks the DB
 * flag directly rather than a JWT claim, so a promotion or demotion takes
 * effect on the very next request instead of waiting for the old token
 * to expire. Must be used after `authenticate` and `authorize('admin')`.
 */
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

/**
 * Blocks access to protected routes until an admin-created staff account
 * has changed its system-generated temporary password. Checks the DB flag
 * directly (same reasoning as requireSuperAdmin) so it clears immediately
 * on the next request after changePassword runs, no re-login required.
 * Applied to report/admin/notification routes, but NOT to authRoutes
 * itself, since /auth/me and /auth/change-password must stay reachable.
 */
function blockIfMustChangePassword(req, res, next) {
  const pool = require('../config/db');
  pool.query('SELECT must_change_password FROM users WHERE user_id = $1', [req.user.userId])
    .then((result) => {
      if (result.rows[0]?.must_change_password) {
        return res.status(403).json({ message: 'You must change your temporary password before continuing', code: 'MUST_CHANGE_PASSWORD' });
      }
      next();
    })
    .catch((err) => {
      console.error('blockIfMustChangePassword check failed:', err);
      res.status(500).json({ message: 'Could not verify account status' });
    });
}

module.exports = { authenticate, authorize, requireSuperAdmin, blockIfMustChangePassword };