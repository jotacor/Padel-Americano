// Player name normalization (frontend).

/** Trim, collapse inner whitespace and uppercase: "  Ana   María " → "ANA MARÍA" (names are always shown in capitals) */
export const cleanName = (name: string): string => name.trim().replace(/\s+/g, ' ').toLocaleUpperCase('es');

/** Same players with uppercase names (older saved/imported data may have mixed case) */
export const upperNames = <T extends { name: string }>(players: T[]): T[] =>
  players.map(p => (p.name === cleanName(p.name) ? p : { ...p, name: cleanName(p.name) }));

/** Tournament with uppercase player names */
export const withUpperNames = <T extends { players: { name: string }[] }>(t: T): T => ({ ...t, players: upperNames(t.players) });

/** Comparison key: case-, accent- and whitespace-insensitive ("Raúl" ≡ "raul ") */
export const nameKey = (name: string): string =>
  cleanName(name).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** True if `name` matches an existing player's name (see `nameKey`) */
export const isNameTaken = (name: string, players: { name: string }[]): boolean => {
  const key = nameKey(name);
  return players.some(p => nameKey(p.name) === key);
};
