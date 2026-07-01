import { locale } from './locale';
import type { Dictionary, LocaleDictionaryModule } from '../../types';

type JsonDictionaryModule = { default?: unknown } | unknown;
type ImportMetaWithGlob = ImportMeta & {
  glob?: (pattern: string, options: { eager: true }) => Record<string, JsonDictionaryModule>;
};

const namespaceModules = ((import.meta as ImportMetaWithGlob).glob?.('./*.json', { eager: true }) ?? {}) as Record<string, JsonDictionaryModule>;

function isDictionary(value: unknown): value is Dictionary {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function readDictionary(module: JsonDictionaryModule): Dictionary {
  const defaultExport = (module as { default?: unknown }).default;
  if (isDictionary(defaultExport)) return defaultExport;
  if (isDictionary(module)) return module;
  return {};
}

export const dictionary: Dictionary = Object.assign({}, ...Object.values(namespaceModules).map((module) => readDictionary(module)));
export { locale };
export const enDictionary = dictionary;
export default { locale, dictionary } satisfies LocaleDictionaryModule;
