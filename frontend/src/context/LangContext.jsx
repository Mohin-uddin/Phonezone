import { createContext, useContext, useState } from 'react';
import translations from '../data/translations';

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('pz_lang') || 'en');

  function toggleLang() {
    const next = lang === 'en' ? 'it' : 'en';
    setLang(next);
    localStorage.setItem('pz_lang', next);
  }

  const t = translations[lang];

  return (
    <LangContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
