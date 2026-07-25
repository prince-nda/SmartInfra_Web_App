const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { signAuthToken, hashToken, generateOtp } = require('../utils/tokenUtils');
const { sendVerificationOtpEmail, sendPasswordResetOtpEmail } = require('../utils/email');
const { toE164 } = require('../utils/sms');

const SALT_ROUNDS = 10;
const OTP_TTL_MINUTES = 10;

// Fields returned to the client - never the password hash
const PUBLIC_USER_FIELDS = `
  user_id, full_name, email, phone, role, national_id_no, district,
  staff_id, department, is_email_verified, is_super_admin, created_at
`;

/**
 * POST /api/auth/register
 * Citizens self-register. Administrator accounts are created separately
 * by an existing admin (see adminController.createStaff) to avoid
 * anyone granting themselves admin rights through this public endpoint.
 *
 * NOTE: OTP delivery is by email for now (SMS via Twilio is pending
 * account setup - see utils/sms.js). Phone is optional and normalized
 * to E.164 if provided, so it's ready to use once SMS is switched back on.
 */
async function register(req, res) {
  const { fullName, email, phone, password, nationalIdNo, district } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ message: 'Full name, email, and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }

  const normalizedPhone = phone ? toE164(phone) : null;

  try {
    const existing = await pool.query('SELECT user_id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await pool.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role, national_id_no, district)
       VALUES ($1, $2, $3, $4, 'citizen', $5, $6)
       RETURNING ${PUBLIC_USER_FIELDS}`,
      [fullName, email.toLowerCase(), normalizedPhone, passwordHash, nationalIdNo || null, district || null]
    );

    const user = result.rows[0];

    const { rawOtp, otpHash } = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    await pool.query(
      'INSERT INTO email_verification_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.user_id, otpHash, expiresAt]
    );
    await sendVerificationOtpEmail(user.email, user.full_name, rawOtp);

    return res.status(201).json({
      message: 'Account created. Enter the verification code we emailed you to activate your account.',
      user,
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Could not create account' });
  }
}

/** POST /api/auth/login */
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = result.rows[0];

    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = signAuthToken(user);
    delete user.password_hash;

    return res.json({ message: 'Login successful', token, user });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Login failed' });
  }
}

/** GET /api/auth/me */
async function getCurrentUser(req, res) {
  try {
    const result = await pool.query(
      `SELECT ${PUBLIC_USER_FIELDS} FROM users WHERE user_id = $1`,
      [req.user.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Get current user error:', err);
    return res.status(500).json({ message: 'Could not fetch profile' });
  }
}

/** POST /api/auth/verify-otp  { email, otp } */
async function verifyOtp(req, res) {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ message: 'Email and verification code are required' });

  try {
    const userResult = await pool.query('SELECT user_id, is_email_verified FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = userResult.rows[0];
    if (!user) {
      return res.status(400).json({ message: 'This verification code is invalid or has expired' });
    }
    if (user.is_email_verified) {
      return res.json({ message: 'This account is already verified. You can log in.' });
    }

    const otpHash = hashToken(otp);
    // Scoped by user_id, not just the hash, since a 6-digit OTP space is
    // small enough that two different users could plausibly land on the
    // same code at the same time.
    const result = await pool.query(
      `SELECT * FROM email_verification_tokens
       WHERE user_id = $1 AND token_hash = $2 AND used = FALSE AND expires_at > NOW()`,
      [user.user_id, otpHash]
    );
    const record = result.rows[0];
    if (!record) {
      return res.status(400).json({ message: 'This verification code is invalid or has expired' });
    }

    await pool.query('UPDATE users SET is_email_verified = TRUE WHERE user_id = $1', [user.user_id]);
    await pool.query('UPDATE email_verification_tokens SET used = TRUE WHERE id = $1', [record.id]);

    return res.json({ message: 'Account verified successfully. You can now log in.' });
  } catch (err) {
    console.error('Verify OTP error:', err);
    return res.status(500).json({ message: 'Could not verify your account' });
  }
}

/** POST /api/auth/resend-otp  { email } */
async function resendOtp(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  // Always respond the same way whether or not the account exists,
  // so this endpoint can't be used to enumerate registered emails.
  const genericResponse = { message: 'If an account exists for this email, a new verification code has been sent.' };

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = result.rows[0];

    if (!user || user.is_email_verified) {
      return res.json(genericResponse);
    }

    // Invalidate any still-live codes so only the newest one can be used
    await pool.query(
      'UPDATE email_verification_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE',
      [user.user_id]
    );

    const { rawOtp, otpHash } = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    await pool.query(
      'INSERT INTO email_verification_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.user_id, otpHash, expiresAt]
    );
    await sendVerificationOtpEmail(user.email, user.full_name, rawOtp);

    return res.json(genericResponse);
  } catch (err) {
    console.error('Resend OTP error:', err);
    return res.status(500).json({ message: 'Could not resend verification code' });
  }
}

/** POST /api/auth/forgot-password  { email } */
async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  const genericResponse = { message: 'If an account exists for this email, a reset code has been sent.' };

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = result.rows[0];
    if (!user) return res.json(genericResponse);

    // Invalidate any still-live codes so only the newest one can be used
    await pool.query(
      'UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE',
      [user.user_id]
    );

    const { rawOtp, otpHash } = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.user_id, otpHash, expiresAt]
    );
    await sendPasswordResetOtpEmail(user.email, user.full_name, rawOtp);

    return res.json(genericResponse);
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ message: 'Could not process password reset request' });
  }
}

/** POST /api/auth/reset-password  { email, otp, newPassword } */
async function resetPassword(req, res) {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ message: 'Email, code, and new password are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }

  try {
    const userResult = await pool.query('SELECT user_id FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = userResult.rows[0];
    if (!user) {
      return res.status(400).json({ message: 'This code is invalid or has expired' });
    }

    const otpHash = hashToken(otp);
    // Scoped by user_id, not just the hash - same reasoning as verify-otp:
    // a 6-digit space is small enough for two users to collide on a code.
    const result = await pool.query(
      `SELECT * FROM password_reset_tokens
       WHERE user_id = $1 AND token_hash = $2 AND used = FALSE AND expires_at > NOW()`,
      [user.user_id, otpHash]
    );
    const record = result.rows[0];
    if (!record) {
      return res.status(400).json({ message: 'This code is invalid or has expired' });
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await pool.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [passwordHash, record.user_id]);
    await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [record.id]);

    return res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ message: 'Could not reset password' });
  }
}

/**
 * POST /api/auth/change-password  { currentPassword, newPassword }
 * For a logged-in user changing their own password - no email required,
 * unlike the forgot/reset flow which needs a working inbox.
 */
async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current and new password are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'New password must be at least 8 characters' });
  }

  try {
    const result = await pool.query('SELECT password_hash FROM users WHERE user_id = $1', [req.user.userId]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ message: 'User not found' });

    const matches = await bcrypt.compare(currentPassword, user.password_hash);
    if (!matches) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await pool.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [passwordHash, req.user.userId]);

    return res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ message: 'Could not change password' });
  }
}

/**
 * PATCH /api/auth/me  { fullName, phone, district, nationalIdNo }
 * Lets a logged-in user edit their own profile. Email and role are not
 * editable here - email changes would need re-verification, and role
 * changes only ever happen via adminController.createStaff. Phone is
 * optional; pass an empty string to clear it.
 */
async function updateProfile(req, res) {
  const { fullName, phone, district, nationalIdNo } = req.body;

  const fields = [];
  const values = [];

  if (fullName !== undefined) {
    if (!fullName.trim()) return res.status(400).json({ message: 'Full name cannot be empty' });
    values.push(fullName);
    fields.push(`full_name = $${values.length}`);
  }
  if (phone !== undefined) {
    const normalizedPhone = phone ? toE164(phone) : null;
    if (normalizedPhone) {
      const conflict = await pool.query('SELECT user_id FROM users WHERE phone = $1 AND user_id != $2', [normalizedPhone, req.user.userId]);
      if (conflict.rows.length > 0) {
        return res.status(409).json({ message: 'Another account is already using this phone number' });
      }
    }
    values.push(normalizedPhone);
    fields.push(`phone = $${values.length}`);
  }
  if (district !== undefined) {
    values.push(district || null);
    fields.push(`district = $${values.length}`);
  }
  if (nationalIdNo !== undefined) {
    values.push(nationalIdNo || null);
    fields.push(`national_id_no = $${values.length}`);
  }

  if (fields.length === 0) {
    return res.status(400).json({ message: 'Nothing to update' });
  }

  values.push(req.user.userId);

  try {
    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE user_id = $${values.length}
       RETURNING ${PUBLIC_USER_FIELDS}`,
      values
    );
    return res.json({ message: 'Profile updated successfully', user: result.rows[0] });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ message: 'Could not update profile' });
  }
}

/**
 * DELETE /api/auth/me  { password }
 * NFR11 (data protection) - lets a citizen delete their own account and
 * data. Requires re-entering their password as a safety confirmation.
 * Restricted to citizens: an admin account should be deactivated/deleted
 * by a super-admin instead (adminController.deactivateStaff/deleteStaff),
 * so a departing admin can't quietly remove themselves from oversight.
 */
async function deleteMyAccount(req, res) {
  const { password } = req.body;
  if (!password) return res.status(400).json({ message: 'Password confirmation is required' });

  try {
    const result = await pool.query('SELECT role, password_hash FROM users WHERE user_id = $1', [req.user.userId]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.role !== 'citizen') {
      return res.status(403).json({ message: 'Administrator accounts must be removed by a super-administrator' });
    }

    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    // Cascades to their reports, images, notifications, and tokens per the FK constraints
    await pool.query('DELETE FROM users WHERE user_id = $1', [req.user.userId]);

    return res.json({ message: 'Your account and data have been deleted' });
  } catch (err) {
    console.error('Delete account error:', err);
    return res.status(500).json({ message: 'Could not delete your account' });
  }
}

module.exports = {
  register,
  login,
  getCurrentUser,
  updateProfile,
  deleteMyAccount,
  verifyOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
  changePassword,
};