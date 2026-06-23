import { openAiCompatibleProviderClientManifest } from '../../providers/openai-compatible/manifest';
import { comfyUiProviderClientManifest } from '../../providers/comfyui/manifest';
import type { ProviderSettings } from '../../domain/providerSettings';
import type { ProviderClientManifest } from './manifest';
import type { ProviderAdapterDefinition } from './types';

export { openAiCompatibleProviderDefinition } from '../../providers/openai-compatible/definition';
export { comfyUiProviderDefinition } from '../../providers/comfyui/definition';

export const providerClientManifests = [
  openAiCompatibleProviderClientManifest,
  comfyUiProviderClientManifest
] satisfies ProviderClientManifest[];
export const providerClientManifestsById = new Map(providerClientManifests.map((manifest) => [manifest.id, manifest]));

export const providerAdapterDefinitions = providerClientManifests.map((manifest) => manifest.definition) satisfies ProviderAdapterDefinition[];
export const providerAdapterDefinitionsById = new Map(providerAdapterDefinitions.map((definition) => [definition.id, definition]));

export function listProviderAdapterDefinitions(): ProviderAdapterDefinition[] {
  return providerAdapterDefinitions;
}

export function isKnownProviderAdapterId(adapterId: string | null | undefined): boolean {
  return Boolean(adapterId && providerAdapterDefinitionsById.has(adapterId));
}

export function getProviderAdapterDefinition(adapterId: string | null | undefined): ProviderAdapterDefinition {
  if (!adapterId) return openAiCompatibleProviderClientManifest.definition;
  return providerAdapterDefinitionsById.get(adapterId) ?? openAiCompatibleProviderClientManifest.definition;
}

export function getProviderAdapterForSettings(provider: Pick<ProviderSettings, 'adapterId'> | null | undefined): ProviderAdapterDefinition {
  return getProviderAdapterDefinition(provider?.adapterId);
}
