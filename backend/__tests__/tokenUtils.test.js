process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_for_unit_tests';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30m';

const jwt = require('jsonwebtoken');
const {
  signAuthToken,
  generateRawAndHashedToken,
  hashToken,
  generateOtp,
  generateTempPassword,
} = require('../utils/tokenUtils');

describe('generateOtp', () => {
  it('produces a 6-digit numeric code', () => {
    const { rawOtp } = generateOtp();
    expect(rawOtp).toMatch(/^\d{6}$/);
  });

  it('produces a SHA-256 hash (64 hex chars) that matches hashToken on the same code', () => {
    const { rawOtp, otpHash } = generateOtp();
    expect(otpHash).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken(rawOtp)).toBe(otpHash);
  });

  it('does not repeat the same code on every call (extremely unlikely if random)', () => {
    const codes = new Set();
    for (let i = 0; i < 20; i++) codes.add(generateOtp().rawOtp);
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe('generateRawAndHashedToken', () => {
  it('produces a hex token whose hash matches hashToken', () => {
    const { rawToken, tokenHash } = generateRawAndHashedToken();
    expect(rawToken).toMatch(/^[a-f0-9]{64}$/); // 32 bytes -> 64 hex chars
    expect(hashToken(rawToken)).toBe(tokenHash);
  });
});

describe('hashToken', () => {
  it('is deterministic - same input always produces the same hash', () => {
    expect(hashToken('abc123')).toBe(hashToken('abc123'));
  });

  it('produces different hashes for different inputs', () => {
    expect(hashToken('abc123')).not.toBe(hashToken('abc124'));
  });
});

describe('generateTempPassword', () => {
  it('produces a 12-character password', () => {
    expect(generateTempPassword()).toHaveLength(12);
  });

  it('avoids visually ambiguous characters (0, O, 1, l, I)', () => {
    const password = generateTempPassword();
    expect(password).not.toMatch(/[0O1lI]/);
  });

  it('produces different passwords on repeated calls', () => {
    const passwords = new Set(Array.from({ length: 10 }, () => generateTempPassword()));
    expect(passwords.size).toBeGreaterThan(1);
  });
});

describe('signAuthToken', () => {
  it('signs a JWT containing the expected user claims', () => {
    const token = signAuthToken({ user_id: 42, role: 'citizen', email: 'test@example.com' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded).toMatchObject({ userId: 42, role: 'citizen', email: 'test@example.com' });
  });
});