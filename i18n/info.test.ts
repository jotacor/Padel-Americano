import { describe, expect, it } from 'vitest';
import { INFO, type InfoBlock } from './info.ts';

const shape = (b: InfoBlock) => `${b.kind}:${b.kind === 'p' ? 1 : b.kind === 'choose' ? b.rows.length : b.items.length}`;
const texts = (b: InfoBlock) => (b.kind === 'p' ? [b.text] : b.kind === 'choose' ? b.rows.flat() : b.items);

describe('Info tab content', () => {
  it('every language has the same sections and blocks', () => {
    const of = (lang: keyof typeof INFO) => INFO[lang].map(s => s.blocks.map(shape).join(','));
    expect(of('en')).toEqual(of('es'));
  });

  it('bold markers are balanced', () => {
    for (const lang of Object.keys(INFO) as (keyof typeof INFO)[]) {
      INFO[lang].forEach(s => s.blocks.flatMap(texts).forEach(text => expect(text.split('**').length % 2, `${lang}: ${text}`).toBe(1)));
    }
  });
});
