import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/i18n/en';
import sr from '@/i18n/sr';

export const supportedLanguages = ['sr', 'en'] as const;
export type AppLanguage = (typeof supportedLanguages)[number];

export function isAppLanguage(value: string): value is AppLanguage {
  return (supportedLanguages as readonly string[]).includes(value);
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      sr: { translation: sr },
    },
    lng: 'sr',
    fallbackLng: 'en',
    supportedLngs: supportedLanguages as unknown as string[],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    returnNull: false,
  });
}

export default i18n;

