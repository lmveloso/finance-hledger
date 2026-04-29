// Pure-logic tests for PinGate's `validPins` helper.
//
// The runner isn't wired into package.json yet (matches the convention used
// by waterfall.test.js / groupReceitas.test.js etc. — they run when the
// harness lands). These assertions cover the only branch that's worth
// testing pure: minute formatting, the "previous minute" tolerance, and
// the day-rollover wrap.

import { describe, it, expect } from 'vitest';
import { validPins } from './PinGate.jsx';

describe('validPins', () => {
  it('returns current and previous minute as 4-digit strings', () => {
    const now = new Date(2026, 3, 29, 14, 43);
    const set = validPins(now);
    expect(set.has('1443')).toBe(true);
    expect(set.has('1442')).toBe(true);
    expect(set.size).toBe(2);
  });

  it('zero-pads single-digit hours and minutes', () => {
    const now = new Date(2026, 3, 29, 9, 5);
    const set = validPins(now);
    expect(set.has('0905')).toBe(true);
    expect(set.has('0904')).toBe(true);
  });

  it('handles midnight rollover — 00:00 accepts 23:59 as previous', () => {
    const now = new Date(2026, 3, 29, 0, 0);
    const set = validPins(now);
    expect(set.has('0000')).toBe(true);
    expect(set.has('2359')).toBe(true);
  });

  it('handles hour rollover — XX:00 accepts (XX-1):59 as previous', () => {
    const now = new Date(2026, 3, 29, 15, 0);
    const set = validPins(now);
    expect(set.has('1500')).toBe(true);
    expect(set.has('1459')).toBe(true);
  });

  it('rejects unrelated 4-digit codes', () => {
    const now = new Date(2026, 3, 29, 14, 43);
    const set = validPins(now);
    expect(set.has('0000')).toBe(false);
    expect(set.has('1234')).toBe(false);
    expect(set.has('1444')).toBe(false); // future minute is NOT accepted
  });
});
