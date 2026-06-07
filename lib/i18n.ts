import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import de from '@/i18n/de';
import en from '@/i18n/en';
import es from '@/i18n/es';
import fr from '@/i18n/fr';
import sr from '@/i18n/sr';

export const supportedLanguages = ['sr', 'en', 'de', 'fr', 'es'] as const;
export type AppLanguage = (typeof supportedLanguages)[number];
const i18n = createInstance();

export function isAppLanguage(value: string): value is AppLanguage {
  return (supportedLanguages as readonly string[]).includes(value);
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      de: { translation: de },
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
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
