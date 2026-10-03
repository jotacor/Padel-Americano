import { describe, expect, it } from 'vitest';
import { retryDelayMs, syncOutcome } from './useShareSync.ts';

describe('share sync decisions', () => {
  it('maps HTTP results to what the organizer device should do', () => {
    expect(syncOutcome(200)).toBe('ok');
    expect(syncOutcome(404)).toBe('expired');
    expect(syncOutcome(403)).toBe('revoked');
    expect(syncOutcome(401)).toBe('revoked');
    [0, 429, 500, 503].forEach(code => expect(syncOutcome(code), String(code)).toBe('retry'));
  });

  it('backs off 2 → 5 → 15 → 30 s and stays at 30 s', () => {
    expect([0, 1, 2, 3, 4, 10].map(retryDelayMs)).toEqual([2000, 5000, 15000, 30000, 30000, 30000]);
  });
});
