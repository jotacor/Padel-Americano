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

// Priority: saved preference > browser language > English
const detectLanguage = (): Language => {
  if (typeof window === 'undefined') return 'en';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLanguage(saved)) return saved;
  } catch {
    // localStorage unavailable
  }
  const browser = navigator.language?.slice(0, 2).toLowerCase();
  return isLanguage(browser) ? browser : 'en';
};

const I18nContext = createContext<I18nContextValue | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(detectLanguage);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Only explicit choices are saved, so the browser-language default keeps applying until then
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

const SWITCHER_STYLES = {
  light: {
    wrapper: 'bg-slate-100 border-slate-200',
    icon: 'text-slate-400',
    active: 'bg-white text-slate-900 shadow-sm',
    inactive: 'text-slate-400 hover:text-slate-600',
  },
  dark: {
    wrapper: 'bg-purple-900 border-purple-700',
    icon: 'text-purple-500',
    active: 'bg-purple-600 text-white',
    inactive: 'text-purple-400 hover:text-purple-200',
  },
};

export const LanguageSwitcher: React.FC<{ variant?: 'light' | 'dark'; className?: string }> = ({ variant = 'light', className = '' }) => {
  const { lang, setLang, t } = useI18n();
  const s = SWITCHER_STYLES[variant];
  return (
    <div role="group" aria-label={t('common.language')} className={`inline-flex items-center gap-0.5 p-1 rounded-xl border ${s.wrapper} ${className}`}>
      <Languages className={`hidden sm:block w-3.5 h-3.5 mx-1 ${s.icon}`} aria-hidden />
      {(Object.keys(LANGUAGES) as Language[]).map(code => (
        <button
          key={code}
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          title={LANGUAGES[code].name}
          className={`px-2 py-1 rounded-lg text-[10px] font-black tracking-wider transition-all ${lang === code ? s.active : s.inactive}`}
        >
          {LANGUAGES[code].label}
        </button>
      ))}
    </div>
  );
};
