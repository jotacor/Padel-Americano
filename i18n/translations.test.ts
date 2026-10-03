import { describe, expect, it } from 'vitest';
import { LANGUAGES, translations, defaultCourtNumber, type Language, type TranslationKey } from './translations.ts';

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();

describe('translations', () => {
  const keys = Object.keys(translations.en) as TranslationKey[];

  it.each(Object.keys(LANGUAGES).filter(l => l !== 'en') as Language[])('%s uses the same {placeholders} as en', lang => {
    keys.forEach(k => expect(placeholders(translations[lang][k]), k).toEqual(placeholders(translations.en[k])));
  });

  it('recognizes default court names in any language', () => {
    expect(defaultCourtNumber('Pista 3')).toBe(3);
    expect(defaultCourtNumber('Court 12')).toBe(12);
    expect(defaultCourtNumber('Pista Central')).toBeNull();
  });
});
