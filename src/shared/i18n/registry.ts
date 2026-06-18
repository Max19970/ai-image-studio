import { enDictionary } from './locales/en';
import { ruDictionary } from './locales/ru';
import type { Dictionary, Locale, LocaleOption, TranslationVars } from './types';

export const localeStorageKey = 'gpt-image-2-studio.locale.v1';

export const locales: LocaleOption[] = [
  { value: 'ru', label: 'Russian', nativeLabel: 'Русский' },
  { value: 'en', label: 'English', nativeLabel: 'English' }
];

export const dictionaries: Record<Locale, Dictionary> = {
  ru: ruDictionary,
  en: enDictionary
};

export type TranslationKey = keyof typeof enDictionary;

export function normalizeLocale(value: string | null): Locale {
  return value === 'en' || value === 'ru' ? value : 'ru';
}

export function interpolate(template: string, vars?: TranslationVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ''));
}

export function translate(locale: Locale, key: string, vars?: TranslationVars): string {
  return interpolate(dictionaries[locale][key] ?? dictionaries.en[key] ?? key, vars);
}

export function getMissingTranslationKeys(source: Locale = 'en', target: Locale = 'ru'): string[] {
  const sourceDictionary = dictionaries[source];
  const targetDictionary = dictionaries[target];
  return Object.keys(sourceDictionary).filter((key) => !(key in targetDictionary));
}
