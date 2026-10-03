import { describe, expect, it } from 'vitest';
import { cleanName, isNameTaken, nameKey } from './playerNames.ts';

describe('player names', () => {
  it('cleans whitespace', () => {
    expect(cleanName('  Ana   María ')).toBe('Ana María');
  });

  it('compares ignoring case, accents and spacing', () => {
    expect(nameKey(' José  Luis ')).toBe(nameKey('jose luis'));
    expect(isNameTaken('MARÍA', [{ name: 'maria' }])).toBe(true);
    expect(isNameTaken('Mario', [{ name: 'maria' }])).toBe(false);
  });
});
