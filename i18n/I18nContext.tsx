import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Languages } from 'lucide-react';
import { LANGUAGES, Language, TranslationKey, translations, defaultCourtNumber } from './translations.ts';

const STORAGE_KEY = 'padel_language';

type Params = Record<string, string | number>;

interface I18nContextValue {
  lang: Language;
  locale: string;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey, params?: Params) => string;
  /** Court label for display: localizes default names ("Court 2" ↔ "Pista 2"), keeps custom ones. */
  courtName: (name: string | undefined, index: number) => string;
}

const isLanguage = (v: unknown): v is Language => typeof v === 'string' && v in LANGUAGES;

// Spanish unless English was chosen: ?lang=xx in the URL (saved, e.g. for a TV display link) > saved choice > 'es'
const DEFAULT_LANGUAGE: Language = 'es';
const detectLanguage = (): Language => {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  const fromUrl = new URLSearchParams(window.location.search).get('lang');
  try {
    if (isLanguage(fromUrl)) {
      localStorage.setItem(STORAGE_KEY, fromUrl);
      return fromUrl;
    }
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLanguage(saved)) return saved;
  } catch {
    // localStorage unavailable
  }
  return isLanguage(fromUrl) ? fromUrl : DEFAULT_LANGUAGE;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(detectLanguage);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Only explicit choices are saved
  const setLang = useCallback((next: Language) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage unavailable
    }
  }, []);

  const t = useCallback((key: TranslationKey, params?: Params) => {
    const template = translations[lang][key] ?? translations.en[key] ?? key;
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (match, p) => (p in params ? String(params[p]) : match));
  }, [lang]);

  const courtName = useCallback((name: string | undefined, index: number) => {
    if (!name) return t('common.court', { n: index + 1 });
    const n = defaultCourtNumber(name);
    return n === null ? name : t('common.court', { n });
  }, [t]);

  const value = useMemo(
    () => ({ lang, locale: LANGUAGES[lang].locale, setLang, t, courtName }),
    [lang, setLang, t, courtName]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
};

/** Discreet link to the other language (Spanish is the default; English is rarely needed) */
export const LanguageLink: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { lang, setLang, t } = useI18n();
  return (
    <>
      {(Object.keys(LANGUAGES) as Language[]).filter(code => code !== lang).map(code => (
        <button
          key={code}
          type="button"
          lang={code}
          onClick={() => setLang(code)}
          title={t('common.language')}
          className={`font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 py-2 transition-colors ${className}`}
        >
          <Languages className="w-3 h-3" aria-hidden /> {LANGUAGES[code].name}
        </button>
      ))}
    </>
  );
};
