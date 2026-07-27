import { describe, it, expect } from 'vitest';
import { RWANDA_DISTRICTS } from '../constants/districts';

describe('RWANDA_DISTRICTS', () => {
  it('contains all 30 districts of Rwanda', () => {
    expect(RWANDA_DISTRICTS).toHaveLength(30);
  });

  it('has no duplicate entries', () => {
    expect(new Set(RWANDA_DISTRICTS).size).toBe(RWANDA_DISTRICTS.length);
  });

  it('includes the three districts of Kigali City', () => {
    expect(RWANDA_DISTRICTS).toEqual(
      expect.arrayContaining(['Gasabo', 'Kicukiro', 'Nyarugenge'])
    );
  });
});