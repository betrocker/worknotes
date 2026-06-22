import AsyncStorage from '@react-native-async-storage/async-storage';

export const SUPPORTED_CURRENCIES = ['RSD', 'EUR', 'USD'] as const;

export type AppCurrency = (typeof SUPPORTED_CURRENCIES)[number];

const CURRENCY_STORAGE_KEY = 'settings.currency';
const DEFAULT_CURRENCY: AppCurrency = 'EUR';

export function isAppCurrency(value: unknown): value is AppCurrency {
  return typeof value === 'string' && SUPPORTED_CURRENCIES.includes(value as AppCurrency);
}

export async function getStoredCurrency(): Promise<AppCurrency> {
  const value = await AsyncStorage.getItem(CURRENCY_STORAGE_KEY);
  return isAppCurrency(value) ? value : DEFAULT_CURRENCY;
}

export async function setStoredCurrency(currency: AppCurrency): Promise<void> {
  await AsyncStorage.setItem(CURRENCY_STORAGE_KEY, currency);
}

export function getCurrencySymbol(currency: AppCurrency) {
  return currency;
}

export function createMoneyFormatter(
  locale: string,
  currency: AppCurrency,
  options: Pick<Intl.NumberFormatOptions, 'minimumFractionDigits' | 'maximumFractionDigits'> = {}
) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'code',
    minimumFractionDigits: options.minimumFractionDigits,
    maximumFractionDigits: options.maximumFractionDigits,
  });
}
