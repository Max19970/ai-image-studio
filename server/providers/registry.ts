import { comfyUiProviderServerManifest } from './comfyui/manifest';
import { openAiCompatibleProviderServerManifest } from './openai-compatible/manifest';
import type { ProviderServerManifest } from './manifest';
import type { ProviderAdapterDefinition, ProviderSettings } from './types';

export const providerServerManifests = [
  openAiCompatibleProviderServerManifest,
  comfyUiProviderServerManifest
] satisfies ProviderServerManifest[];

export const providerServerManifestsById = new Map(providerServerManifests.map((manifest) => [manifest.id, manifest]));
const adapters = providerServerManifests.map((manifest) => manifest.adapter) satisfies ProviderAdapterDefinition[];

export const providerAdaptersById = new Map(adapters.map((adapter) => [adapter.id, adapter]));

export function getProviderAdapter(adapterId = openAiCompatibleProviderServerManifest.id): ProviderAdapterDefinition {
  const manifest = providerServerManifestsById.get(adapterId);
  if (!manifest) {
    console.warn(`[providers] Unknown adapter "${adapterId}". Falling back to ${openAiCompatibleProviderServerManifest.id}.`);
    return openAiCompatibleProviderServerManifest.adapter;
  }
  return manifest.adapter;
}

export function parseProviderSettings(value: unknown): ProviderSettings {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const adapterId = typeof source.adapterId === 'string' ? source.adapterId : undefined;
  const adapter = getProviderAdapter(adapterId);
  return adapter.settingsSchema.parse(source);
}
