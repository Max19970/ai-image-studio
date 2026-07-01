import type { IntegrationDefinition, IntegrationId } from '../../domain/integrations';
import { integrationDefinitionFallbackModules } from './registry.generated';

type IntegrationDefinitionModule = Record<string, unknown>;
type ImportMetaWithGlob = ImportMeta & {
  glob?: (pattern: string, options: { eager: true }) => Record<string, IntegrationDefinitionModule>;
};

const discoveredIntegrationModules = (import.meta as ImportMetaWithGlob).glob?.('../../integrations/*/definition.ts', { eager: true }) ?? {};
const integrationModules = {
  ...integrationDefinitionFallbackModules,
  ...discoveredIntegrationModules
} as Record<string, IntegrationDefinitionModule>;

function isIntegrationDefinition(value: unknown): value is IntegrationDefinition {
  const candidate = value as Partial<IntegrationDefinition> | null;
  return Boolean(candidate?.id && candidate.label && candidate.kind && candidate.capabilities);
}

function collectIntegrationDefinitions(): IntegrationDefinition[] {
  const byId = new Map<IntegrationId, { definition: IntegrationDefinition; sourcePath: string }>();
  for (const [sourcePath, module] of Object.entries(integrationModules)) {
    for (const definition of Object.values(module).filter(isIntegrationDefinition)) {
      byId.set(definition.id, { definition, sourcePath });
    }
  }
  return [...byId.values()]
    .sort((a, b) => a.definition.order - b.definition.order || a.definition.label.localeCompare(b.definition.label) || a.sourcePath.localeCompare(b.sourcePath))
    .map(({ definition }) => definition);
}

export const integrationDefinitions = collectIntegrationDefinitions();

export const integrationDefinitionsById = new Map<IntegrationId, IntegrationDefinition>(
  integrationDefinitions.map((definition) => [definition.id, definition])
);

export function listIntegrationDefinitions(): IntegrationDefinition[] {
  return [...integrationDefinitions];
}

export function isKnownIntegrationId(id: string | null | undefined): id is IntegrationId {
  return Boolean(id && integrationDefinitionsById.has(id));
}

export function getIntegrationDefinition(id: string | null | undefined): IntegrationDefinition | null {
  if (!id) return null;
  return integrationDefinitionsById.get(id) ?? null;
}

export function requireIntegrationDefinition(id: string | null | undefined): IntegrationDefinition {
  const definition = getIntegrationDefinition(id);
  if (!definition) throw new Error(`Unknown integration: ${id || 'empty id'}`);
  return definition;
}
