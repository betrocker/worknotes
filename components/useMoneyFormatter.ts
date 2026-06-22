import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { createMoneyFormatter } from '@/lib/currency';
import { useCurrency } from '@/providers/CurrencyProvider';

type UseMoneyFormatterOptions = Pick<Intl.NumberFormatOptions, 'minimumFractionDigits' | 'maximumFractionDigits'>;

export function getMoneyLocale(language: string) {
  return language === 'sr' ? 'sr-Latn-RS' : language;
}

export function useMoneyFormatter(options: UseMoneyFormatterOptions = {}) {
  const { i18n } = useTranslation();
  const { currency } = useCurrency();
  const locale = getMoneyLocale(i18n.language);
  const minimumFractionDigits = options.minimumFractionDigits;
  const maximumFractionDigits = options.maximumFractionDigits;

  return useMemo(
    () => createMoneyFormatter(locale, currency, { minimumFractionDigits, maximumFractionDigits }),
    [currency, locale, maximumFractionDigits, minimumFractionDigits]
  );
}
