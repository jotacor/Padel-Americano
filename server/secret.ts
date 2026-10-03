// Write secret of a shared tournament. The organizer's device keeps it (never shown to users).

const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

export const sha256Hex = async (s: string): Promise<string> =>
  toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));

/** 128-bit random token (base64url): guessing it is hopeless, so no rate limiting is needed */
export function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export const hashSecret = async (secret: string): Promise<string> => `sha256:${await sha256Hex(secret)}`;

/** Shares created before tokens: 32-bit hash of a 4-digit PIN. Still accepted until they expire. */
function legacyHashPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    hash = ((hash << 5) - hash) + pin.charCodeAt(i);
    hash = hash & hash; // 32-bit
  }
  return hash.toString(16);
}

export const verifySecret = async (secret: string, stored: string): Promise<boolean> =>
  stored.startsWith('sha256:') ? (await hashSecret(secret)) === stored : legacyHashPin(secret) === stored;
