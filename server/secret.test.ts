import { describe, expect, it } from 'vitest';
import { generateToken, hashSecret, verifySecret } from './secret.ts';

describe('share write secret', () => {
  it('generates 128-bit url-safe tokens', () => {
    const a = generateToken(), b = generateToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(a).not.toBe(b);
  });

  it('verifies new tokens and rejects wrong ones', async () => {
    const token = generateToken();
    const stored = await hashSecret(token);
    expect(stored).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(await verifySecret(token, stored)).toBe(true);
    expect(await verifySecret(generateToken(), stored)).toBe(false);
  });

  it('still accepts shares created with the old 4-digit PIN hash', async () => {
    // 32-bit Java-style hash of "4821", as stored by the previous version
    const legacy = (pin: string) => { let h = 0; for (const c of pin) { h = ((h << 5) - h) + c.charCodeAt(0); h &= h; } return h.toString(16); };
    expect(await verifySecret('4821', legacy('4821'))).toBe(true);
    expect(await verifySecret('4822', legacy('4821'))).toBe(false);
  });
});
