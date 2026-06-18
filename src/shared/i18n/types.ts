export type Locale = 'ru' | 'en';

export type TranslationVars = Record<string, string | number | boolean | null | undefined>;
export type Dictionary = Record<string, string>;

export interface LocaleOption {
  value: Locale;
  label: string;
  nativeLabel: string;
}

export interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: TranslationVars) => string;
}
