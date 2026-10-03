// Player name normalization (frontend).

/** Trim and collapse inner whitespace: "  Ana   María " → "Ana María" */
export const cleanName = (name: string): string => name.trim().replace(/\s+/g, ' ');

/** Comparison key: case-, accent- and whitespace-insensitive ("Raúl" ≡ "raul ") */
export const nameKey = (name: string): string =>
  cleanName(name).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** True if `name` matches an existing player's name (see `nameKey`) */
export const isNameTaken = (name: string, players: { name: string }[]): boolean => {
  const key = nameKey(name);
  return players.some(p => nameKey(p.name) === key);
};
