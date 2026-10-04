import { describe, expect, it } from 'vitest';
import { cleanName, isNameTaken, nameKey, withUpperNames } from './playerNames.ts';

describe('player names', () => {
  it('cleans whitespace and uppercases', () => {
    expect(cleanName('  Ana   María ')).toBe('ANA MARÍA');
  });

  it('normalizes saved/imported tournaments to uppercase', () => {
    const t = { players: [{ id: 'a', name: 'raúl' }, { id: 'b', name: 'EVA' }] };
    expect(withUpperNames(t).players.map(p => p.name)).toEqual(['RAÚL', 'EVA']);
  });

  it('compares ignoring case, accents and spacing', () => {
    expect(nameKey(' José  Luis ')).toBe(nameKey('jose luis'));
    expect(isNameTaken('MARÍA', [{ name: 'maria' }])).toBe(true);
    expect(isNameTaken('Mario', [{ name: 'maria' }])).toBe(false);
  });
});
