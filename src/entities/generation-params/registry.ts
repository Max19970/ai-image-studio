import { createElement } from 'react';
import type { CapabilityKey } from '../../domain/providerProbe';
import { isProviderCapabilitySupported, getUnsupportedProviderCapabilityKeys } from '../provider';
import { isGenerationParamAvailableForProvider, getUnavailableProviderGenerationParams } from './providerAvailability';
import { logicalGenerationParamDefinitions } from './logicalRegistry';
import type {
  GenerationParamFieldContext,
  GenerationParamFieldDefinition,
  GenerationParamFieldPlacement,
  GenerationParamSlot,
  GenerationParamTab,
  ResolvedGenerationParamFieldPlacement
} from './types';

const definitionModules = import.meta.glob('./fields/**/definition.ts', { eager: true }) as Record<string, unknown>;
const placementModules = import.meta.glob('./placements/**/*.placement.ts', { eager: true }) as Record<string, unknown>;

type DefinitionModule = {
  default?: GenerationParamFieldDefinition;
  definition?: GenerationParamFieldDefinition;
};

type PlacementModule = {
  default?: GenerationParamFieldPlacement | GenerationParamFieldPlacement[];
  placement?: GenerationParamFieldPlacement;
  placements?: GenerationParamFieldPlacement[];
};

function exportedDefinitions() {
  return Object.entries(definitionModules)
    .map(([sourcePath, rawModule]) => {
      const module = rawModule as DefinitionModule;
      const definition = module.definition ?? module.default;
      return definition ? { ...definition, sourcePath } : null;
    })
    .filter((item): item is GenerationParamFieldDefinition & { sourcePath: string } => item !== null);
}

function toPlacements(rawModule: unknown): GenerationParamFieldPlacement[] {
  const module = rawModule as PlacementModule;
  const exported = module.placements ?? module.placement ?? module.default;
  if (!exported) return [];
  return Array.isArray(exported) ? exported : [exported];
}

export const generationParamFieldDefinitions = exportedDefinitions();
export const generationParamFieldDefinitionsById = new Map(generationParamFieldDefinitions.map((definition) => [definition.id, definition]));

export const generationParamFieldPlacements = Object.entries(placementModules)
  .flatMap(([sourcePath, module]) => toPlacements(module).map((placement) => ({ ...placement, sourcePath })))
  .sort((a, b) => a.slot.localeCompare(b.slot) || a.order - b.order || a.id.localeCompare(b.id));

if (import.meta.env.DEV) {
  const seenDefinitions = new Map<string, string>();
  for (const definition of generationParamFieldDefinitions) {
    const previous = seenDefinitions.get(definition.id);
    if (previous) console.warn(`[generation-params] Duplicate field definition "${definition.id}" from ${previous} and ${definition.sourcePath}`);
    seenDefinitions.set(definition.id, definition.sourcePath);
  }

  const seenPlacements = new Map<string, string>();
  for (const placement of generationParamFieldPlacements) {
    const previous = seenPlacements.get(placement.id);
    if (previous) console.warn(`[generation-params] Duplicate field placement "${placement.id}" from ${previous} and ${placement.sourcePath}`);
    seenPlacements.set(placement.id, placement.sourcePath);
    if (!generationParamFieldDefinitionsById.has(placement.use)) console.warn(`[generation-params] Placement "${placement.id}" references missing definition "${placement.use}" from ${placement.sourcePath}`);
    if (!placement.slot?.startsWith('composer/parameters/')) console.warn(`[generation-params] Placement "${placement.id}" should define a composer/parameters/* slot.`);
  }
}

function capabilitySupported(context: GenerationParamFieldContext, key: CapabilityKey): boolean {
  return isProviderCapabilitySupported(context.capabilityReport, context.mode, key);
}

export function getHiddenCapabilityKeys(context: Pick<GenerationParamFieldContext, 'mode' | 'capabilityReport'>, keys: CapabilityKey[]): CapabilityKey[] {
  return getUnsupportedProviderCapabilityKeys(context, keys);
}

export function getHiddenProviderParamDefinitions(context: GenerationParamFieldContext) {
  return getUnavailableProviderGenerationParams(logicalGenerationParamDefinitions, context);
}

const logicalDefinitionByFieldId = new Map(logicalGenerationParamDefinitions.map((definition) => [definition.fieldDefinitionId, definition]));

export function renderGenerationParamSlot(slot: GenerationParamSlot, context: GenerationParamFieldContext) {
  return generationParamFieldPlacements
    .filter((placement) => placement.slot === slot)
    .filter((placement) => !placement.mode || placement.mode === 'any' || placement.mode === context.mode)
    .filter((placement) => {
      const logicalDefinition = logicalDefinitionByFieldId.get(placement.use);
      return !logicalDefinition || isGenerationParamAvailableForProvider(logicalDefinition, context);
    })
    .filter((placement) => !placement.requiresCapability || capabilitySupported(context, placement.requiresCapability))
    .map((placement) => {
      const definition = generationParamFieldDefinitionsById.get(placement.use);
      if (!definition) return null;

      const props = {
        ...(definition.defaultProps ?? {}),
        ...(placement.props ?? {})
      } as Record<string, unknown>;

      if (definition.enabled && !definition.enabled(context, props)) return null;

      const resolvedPlacement: ResolvedGenerationParamFieldPlacement = {
        ...placement,
        sourcePath: placement.sourcePath,
        definitionSourcePath: definition.sourcePath ?? definition.id
      };

      return createElement(definition.Component as any, {
        key: placement.id,
        context,
        placement: resolvedPlacement,
        props
      });
    });
}
