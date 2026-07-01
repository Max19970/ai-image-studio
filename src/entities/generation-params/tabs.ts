import { generationParamTabFallbackModules } from './tabs.generated';
import type { GenerationParamTabDefinition } from './types';

type GenerationParamTabModule = Record<string, unknown>;
type ImportMetaWithGlob = ImportMeta & {
  glob?: (pattern: string, options: { eager: true }) => Record<string, GenerationParamTabModule>;
};

const discoveredTabModules = ((import.meta as ImportMetaWithGlob).glob?.('./tabs/*.tab.ts', { eager: true }) ?? {}) as Record<string, GenerationParamTabModule>;
const tabModules = {
  ...generationParamTabFallbackModules,
  ...discoveredTabModules
} as Record<string, GenerationParamTabModule>;

function isGenerationParamTabDefinition(value: unknown): value is GenerationParamTabDefinition {
  const candidate = value as Partial<GenerationParamTabDefinition> | null;
  return Boolean(candidate?.id && candidate.slot && candidate.labelKey && candidate.hintKey);
}

export const generationParamTabs = Array.from(
  Object.values(tabModules)
    .flatMap((module) => Object.values(module).filter(isGenerationParamTabDefinition))
    .reduce((byId, tab) => byId.set(tab.id, tab), new Map<string, GenerationParamTabDefinition>())
    .values()
);

export const generationParamTabsById = new Map(generationParamTabs.map((tab) => [tab.id, tab]));
