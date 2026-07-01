import { workflowPluginGeneratedModules } from './index.generated';
import type { WorkflowPluginDefinition } from '../workflowPluginTypes';

type WorkflowPluginModule = Record<string, unknown>;
type ImportMetaWithGlob = ImportMeta & {
  glob?: (pattern: string, options: { eager: true }) => Record<string, WorkflowPluginModule>;
};

const discoveredWorkflowPluginModules = (import.meta as ImportMetaWithGlob).glob?.('./*Plugin.tsx', { eager: true }) ?? {};
const workflowPluginModules = {
  ...workflowPluginGeneratedModules,
  ...discoveredWorkflowPluginModules
} as Record<string, WorkflowPluginModule>;

function isWorkflowPluginDefinition(value: unknown): value is WorkflowPluginDefinition {
  const candidate = value as Partial<WorkflowPluginDefinition> | null;
  return Boolean(candidate?.kind && candidate.payloadKey && candidate.labelKey && candidate.descriptionKey && typeof candidate.getSummary === 'function' && typeof candidate.renderSettings === 'function');
}

function collectWorkflowPluginDefinitions(): WorkflowPluginDefinition[] {
  const byKind = new Map<string, { definition: WorkflowPluginDefinition; sourcePath: string }>();
  for (const [sourcePath, module] of Object.entries(workflowPluginModules)) {
    for (const definition of Object.values(module).filter(isWorkflowPluginDefinition)) {
      byKind.set(definition.kind, { definition, sourcePath });
    }
  }
  return [...byKind.values()]
    .sort((a, b) => (a.definition.order ?? 1000) - (b.definition.order ?? 1000) || a.definition.kind.localeCompare(b.definition.kind) || a.sourcePath.localeCompare(b.sourcePath))
    .map(({ definition }) => definition);
}

export const workflowPluginDefinitions: readonly WorkflowPluginDefinition[] = collectWorkflowPluginDefinitions();

export const workflowPluginDefinitionsByKind = new Map(
  workflowPluginDefinitions.map((definition) => [definition.kind, definition] as const)
);

export const workflowPluginKinds = workflowPluginDefinitions.map((definition) => definition.kind);

export const workflowPluginKindAliases = new Map<string, string>(
  workflowPluginDefinitions.flatMap((definition) => [
    [definition.kind, definition.kind] as const,
    ...(definition.legacyKinds ?? []).map((legacyKind) => [legacyKind, definition.kind] as const)
  ])
);
