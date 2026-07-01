import { localeFallbackModules } from './registry.generated';
import type { Dictionary, Locale, LocaleDictionaryModule, LocaleOption, TranslationVars } from './types';

export const localeStorageKey = 'gpt-image-2-studio.locale.v1';

type ImportMetaWithGlob = ImportMeta & {
  glob?: (pattern: string, options: { eager: true }) => Record<string, LocaleDictionaryModule>;
};

const discoveredLocaleModules = (import.meta as ImportMetaWithGlob).glob?.('./locales/*/index.ts', { eager: true }) ?? {};
const localeModules = {
  ...localeFallbackModules,
  ...discoveredLocaleModules
} as Record<string, LocaleDictionaryModule>;

function isLocaleOption(value: unknown): value is LocaleOption {
  const candidate = value as Partial<LocaleOption> | null;
  return Boolean(candidate?.value && candidate.label && candidate.nativeLabel);
}

function collectLocaleEntries(modules: Record<string, LocaleDictionaryModule>) {
  return Object.entries(modules)
    .flatMap(([sourcePath, module]) => {
      if (!isLocaleOption(module.locale) || !module.dictionary) return [];
      return [{ locale: module.locale, dictionary: module.dictionary, sourcePath }];
    })
    .sort((a, b) => Number(Boolean(b.locale.default)) - Number(Boolean(a.locale.default)) || a.locale.value.localeCompare(b.locale.value) || a.sourcePath.localeCompare(b.sourcePath));
}

const localeEntries = collectLocaleEntries(localeModules);
const defaultLocale = localeEntries[0]?.locale.value ?? 'en';

export const locales: LocaleOption[] = localeEntries.map((entry) => entry.locale);
export const dictionaries: Record<Locale, Dictionary> = Object.fromEntries(localeEntries.map((entry) => [entry.locale.value, entry.dictionary]));

export type TranslationKey = string;

export function normalizeLocale(value: string | null): Locale {
  return value && dictionaries[value] ? value : defaultLocale;
}

export function interpolate(template: string, vars?: TranslationVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ''));
}

export function translate(locale: Locale, key: string, vars?: TranslationVars): string {
  const dictionary = dictionaries[normalizeLocale(locale)];
  const fallbackDictionary = dictionaries[defaultLocale] ?? dictionary;
  return interpolate(dictionary?.[key] ?? fallbackDictionary?.[key] ?? key, vars);
}

export function getMissingTranslationKeys(source: Locale = defaultLocale, target: Locale = 'ru'): string[] {
  const sourceDictionary = dictionaries[normalizeLocale(source)] ?? {};
  const targetDictionary = dictionaries[normalizeLocale(target)] ?? {};
  return Object.keys(sourceDictionary).filter((key) => !(key in targetDictionary));
}
