import { createContext, useContext, useState, ReactNode } from 'react';
import type { Lang } from '../i18n/translations';
import { T } from '../i18n/translations';

type AnyTranslation = typeof T[keyof typeof T];
interface LangCtx { lang: Lang; t: AnyTranslation; toggle: () => void; }
const LangContext = createContext<LangCtx>({ lang: 'en', t: T.en, toggle: () => {} });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');
  return (
    <LangContext.Provider value={{ lang, t: T[lang], toggle: () => setLang(l => l === 'en' ? 'ml' : 'en') }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
