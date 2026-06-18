import type { ElementDefinition } from './types';

const definitionModules = import.meta.glob('../../features/**/{elements,sections}/**/definition.ts', { eager: true }) as Record<string, unknown>;

type DefinitionModule = {
  default?: ElementDefinition;
  definition?: ElementDefinition;
};

export const elementDefinitions = Object.entries(definitionModules)
  .map(([sourcePath, rawModule]) => {
    const module = rawModule as DefinitionModule;
    const definition = module.definition ?? module.default;
    return definition ? { ...definition, sourcePath } : null;
  })
  .filter((item): item is ElementDefinition & { sourcePath: string } => item !== null);

if (import.meta.env.DEV) {
  const seen = new Map<string, string>();
  for (const definition of elementDefinitions) {
    const previous = seen.get(definition.id);
    if (previous) {
      console.warn(`[definitions] Duplicate definition id "${definition.id}" from ${previous} and ${definition.sourcePath}`);
    }
    seen.set(definition.id, definition.sourcePath);
    if (!definition.id || !definition.Component) {
      console.warn(`[definitions] Definition ${definition.sourcePath} should define stable id and Component.`);
    }
  }
}

export const definitionsById = new Map(elementDefinitions.map((definition) => [definition.id, definition]));
