import type { ProviderServerManifest } from './manifest';
import type { ProviderAdapterDefinition, ProviderSettings } from './types';
import { providerServerManifestGeneratedModules } from './registry.generated';

type ProviderManifestModule = Record<string, unknown>;

function isProviderServerManifest(value: unknown): value is ProviderServerManifest {
  const candidate = value as Partial<ProviderServerManifest> | null;
  return Boolean(candidate?.id && candidate.adapter && candidate.architecture);
}

function collectProviderServerManifests(modules: Record<string, ProviderManifestModule>): ProviderServerManifest[] {
  return Object.entries(modules)
    .flatMap(([sourcePath, module]) =>
      Object.values(module)
        .filter(isProviderServerManifest)
        .map((manifest) => ({ manifest, sourcePath }))
    )
    .sort((a, b) => a.manifest.id.localeCompare(b.manifest.id) || a.sourcePath.localeCompare(b.sourcePath))
    .map(({ manifest }) => manifest);
}

export const providerServerManifests = collectProviderServerManifests(providerServerManifestGeneratedModules);
export const providerServerManifestsById = new Map(providerServerManifests.map((manifest) => [manifest.id, manifest]));

const adapters = providerServerManifests.map((manifest) => manifest.adapter) satisfies ProviderAdapterDefinition[];
export const providerAdaptersById = new Map(adapters.map((adapter) => [adapter.id, adapter]));

export const defaultProviderAdapterId = 'openai-compatible';

export function assertKnownProviderAdapterId(adapterId: string): string {
  if (!providerServerManifestsById.has(adapterId)) {
    throw new Error(`[providers] Unknown provider adapter "${adapterId}".`);
  }
  return adapterId;
}

export function resolveProviderAdapterId(adapterId: string | null | undefined): string {
  return assertKnownProviderAdapterId(adapterId || defaultProviderAdapterId);
}

export function getProviderAdapter(adapterId: string | null | undefined = defaultProviderAdapterId): ProviderAdapterDefinition {
  const resolvedId = resolveProviderAdapterId(adapterId);
  const manifest = providerServerManifestsById.get(resolvedId);
  if (!manifest) throw new Error(`[providers] Provider adapter "${resolvedId}" is not registered.`);
  return manifest.adapter;
}

export function parseProviderSettings(value: unknown): ProviderSettings {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const adapterId = typeof source.adapterId === 'string' ? source.adapterId : defaultProviderAdapterId;
  const adapter = getProviderAdapter(adapterId);
  return adapter.settingsSchema.parse({ ...source, adapterId });
}
