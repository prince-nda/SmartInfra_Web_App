const { toE164 } = require('../utils/sms');

describe('toE164', () => {
  it('returns null for empty/falsy input', () => {
    expect(toE164('')).toBeNull();
    expect(toE164(null)).toBeNull();
    expect(toE164(undefined)).toBeNull();
  });

  it('passes through a number that already starts with +', () => {
    expect(toE164('+250788123456')).toBe('+250788123456');
  });

  it('converts a local 07... number to +250 format', () => {
    expect(toE164('0788123456')).toBe('+250788123456');
  });

  it('adds the + prefix to a number already starting with the country code', () => {
    expect(toE164('250788123456')).toBe('+250788123456');
  });

  it('strips spaces and formatting characters before normalizing', () => {
    expect(toE164('07 8812 3456')).toBe('+250788123456');
    expect(toE164('(078) 812-3456')).toBe('+250788123456');
  });

  it('falls back to prefixing +250 for a bare 9-digit number', () => {
    expect(toE164('788123456')).toBe('+250788123456');
  });
});