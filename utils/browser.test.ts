import { afterEach, describe, expect, it, vi } from 'vitest';
import { newId } from './browser.ts';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => vi.unstubAllGlobals());

describe('newId', () => {
  it('returns a UUID v4', () => {
    expect(newId()).toMatch(UUID_V4);
  });

  it('works without crypto.randomUUID (plain http on a LAN IP)', () => {
    const { getRandomValues } = globalThis.crypto;
    vi.stubGlobal('crypto', { getRandomValues: getRandomValues.bind(globalThis.crypto) });
    const ids = new Set(Array.from({ length: 200 }, () => newId()));
    expect(ids.size).toBe(200);
    ids.forEach(id => expect(id).toMatch(UUID_V4));
  });
});
