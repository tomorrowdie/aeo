'use client';

import { useState, useEffect } from 'react';
import { i18n, Language } from '@/lib/i18n';

export function useLanguage() {
  const [lang, setLang] = useState<Language>('en');

  useEffect(() => {
    const saved = localStorage.getItem('aeo_lang') as Language;
    if (saved && i18n[saved]) {
      setLang(saved);
    }
  }, []);

  const changeLanguage = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('aeo_lang', newLang);
  };

  const t = i18n[lang];

  return { lang, setLang: changeLanguage, t };
}
