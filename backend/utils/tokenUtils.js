const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/** Signs a login/session JWT. Expires per JWT_EXPIRES_IN (default 7d). */
function signAuthToken(user) {
  return jwt.sign(
    { userId: user.user_id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

/**
 * Generates a random, URL-safe token plus its SHA-256 hash.
 * The raw token is emailed to the user; only the hash is stored in the DB,
 * so a leaked database never exposes usable reset/verification links.
 */
function generateRawAndHashedToken() {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  return { rawToken, tokenHash };
}

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Generates a 6-digit numeric OTP plus its SHA-256 hash, same pattern as
 * generateRawAndHashedToken but sized for SMS delivery (short, typeable).
 */
function generateOtp() {
  const rawOtp = crypto.randomInt(100000, 1000000).toString();
  const otpHash = crypto.createHash('sha256').update(rawOtp).digest('hex');
  return { rawOtp, otpHash };
}

/**
 * Generates a random, readable temporary password for admin-created staff
 * accounts - avoids ambiguous characters (0/O, 1/l/I) so it's easy to
 * type correctly when a super-admin hands it off verbally or in a message.
 */
function generateTempPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars[crypto.randomInt(0, chars.length)];
  }
  return result;
}

module.exports = { signAuthToken, generateRawAndHashedToken, hashToken, generateOtp, generateTempPassword };