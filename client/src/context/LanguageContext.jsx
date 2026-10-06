// English / Tamil switching. t('nav.home') looks the key up in the active language file and falls
// back to English, so a missing Tamil string never shows an empty label.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from '../i18n/en.json';
import ta from '../i18n/ta.json';

const LANGUAGE_KEY = 'lifelens_lang';
const dictionaries = { en, ta };

const LanguageContext = createContext(null);

function lookup(dictionary, key) {
  return key.split('.').reduce((node, part) => (node && typeof node === 'object' ? node[part] : undefined), dictionary);
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => (localStorage.getItem(LANGUAGE_KEY) === 'ta' ? 'ta' : 'en'));

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLanguage = useCallback((next) => {
    const value = next === 'ta' ? 'ta' : 'en';
    localStorage.setItem(LANGUAGE_KEY, value);
    setLangState(value);
  }, []);

  // t(key, { n: 3 }) replaces {n} in the text.
  const t = useCallback(
    (key, params) => {
      let text = lookup(dictionaries[lang], key);
      if (typeof text !== 'string') text = lookup(dictionaries.en, key);
      if (typeof text !== 'string') return key;
      if (params) {
        Object.entries(params).forEach(([name, value]) => {
          text = text.split(`{${name}}`).join(String(value));
        });
      }
      return text;
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLanguage, t }), [lang, setLanguage, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}
