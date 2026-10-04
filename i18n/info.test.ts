import { describe, expect, it } from 'vitest';
import { INFO } from './info.ts';

describe('Info tab content', () => {
  it('every language has the same sections and items', () => {
    const shape = (lang: keyof typeof INFO) => INFO[lang].map(s => s.items.length);
    expect(shape('en')).toEqual(shape('es'));
    for (const lang of Object.keys(INFO) as (keyof typeof INFO)[]) {
      INFO[lang].forEach(s => s.items.forEach(item => expect(item.split('**').length % 2, `${lang}: ${item}`).toBe(1)));
    }
  });
});
