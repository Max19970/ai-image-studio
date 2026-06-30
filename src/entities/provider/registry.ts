import type { ProviderSettings } from '../../domain/providerSettings';
import type { ProviderClientManifest } from './manifest';
import type { ProviderAdapterDefinition } from './types';
import { providerClientManifestGeneratedModules } from './registry.generated';

type ProviderManifestModule = Record<string, unknown>;
type ImportMetaWithGlob = ImportMeta & {
  glob?: (pattern: string, options: { eager: true }) => Record<string, ProviderManifestModule>;
};

export type ProviderAdapterFallbackReason = 'missing-adapter' | 'unknown-adapter';

export interface ProviderAdapterFallbackPolicy {
  resolveDefinition(context: {
    adapterId: string | null | undefined;
    reason: ProviderAdapterFallbackReason;
    definitionsById: ReadonlyMap<string, ProviderAdapterDefinition>;
  }): ProviderAdapterDefinition;
}

export const defaultProviderAdapterId = 'openai-compatible';

const discoveredProviderManifestModules = (import.meta as ImportMetaWithGlob).glob?.('../../providers/*/manifest.ts', { eager: true }) ?? {};
const providerManifestModules = {
  ...providerClientManifestGeneratedModules,
  ...discoveredProviderManifestModules
} as Record<string, ProviderManifestModule>;

function isProviderClientManifest(value: unknown): value is ProviderClientManifest {
  const candidate = value as Partial<ProviderClientManifest> | null;
  return Boolean(candidate?.id && candidate.definition && candidate.architecture);
}

function collectProviderClientManifests(modules: Record<string, ProviderManifestModule>): ProviderClientManifest[] {
  return Object.entries(modules)
    .flatMap(([sourcePath, module]) =>
      Object.values(module)
        .filter(isProviderClientManifest)
        .map((manifest) => ({ manifest, sourcePath }))
    )
    .sort((a, b) => a.manifest.id.localeCompare(b.manifest.id) || a.sourcePath.localeCompare(b.sourcePath))
    .map(({ manifest }) => manifest);
}

export const providerClientManifests = collectProviderClientManifests(providerManifestModules);
export const providerClientManifestsById = new Map(providerClientManifests.map((manifest) => [manifest.id, manifest]));

export const providerAdapterDefinitions = providerClientManifests.map((manifest) => manifest.definition) satisfies ProviderAdapterDefinition[];
export const providerAdapterDefinitionsById = new Map(providerAdapterDefinitions.map((definition) => [definition.id, definition]));

const defaultProviderAdapterFallbackPolicy: ProviderAdapterFallbackPolicy = {
  resolveDefinition: ({ adapterId, reason, definitionsById }) => {
    const fallback = definitionsById.get(defaultProviderAdapterId);
    if (!fallback) throw new Error(`[provider] Default provider adapter "${defaultProviderAdapterId}" is not registered.`);
    if (adapterId && reason === 'unknown-adapter') {
      console.warn(`[provider] Unknown provider adapter "${adapterId}". Falling back to "${defaultProviderAdapterId}".`);
    }
    return fallback;
  }
};

let providerAdapterFallbackPolicy = defaultProviderAdapterFallbackPolicy;

export function setProviderAdapterFallbackPolicy(policy: ProviderAdapterFallbackPolicy): void {
  providerAdapterFallbackPolicy = policy;
}

export function listProviderAdapterDefinitions(): ProviderAdapterDefinition[] {
  return providerAdapterDefinitions;
}

export function isKnownProviderAdapterId(adapterId: string | null | undefined): boolean {
  return Boolean(adapterId && providerAdapterDefinitionsById.has(adapterId));
}

export function getProviderAdapterDefinition(adapterId: string | null | undefined): ProviderAdapterDefinition {
  if (adapterId && providerAdapterDefinitionsById.has(adapterId)) return providerAdapterDefinitionsById.get(adapterId)!;
  return providerAdapterFallbackPolicy.resolveDefinition({
    adapterId,
    reason: adapterId ? 'unknown-adapter' : 'missing-adapter',
    definitionsById: providerAdapterDefinitionsById
  });
}

export function getProviderAdapterForSettings(provider: Pick<ProviderSettings, 'adapterId'> | null | undefined): ProviderAdapterDefinition {
  return getProviderAdapterDefinition(provider?.adapterId);
}
