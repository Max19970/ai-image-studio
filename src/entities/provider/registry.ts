import { openAiCompatibleProviderDefinition } from '../../providers/openai-compatible/definition';
import { comfyUiProviderDefinition } from '../../providers/comfyui/definition';
import type { ProviderSettings } from '../../domain/providerSettings';
import type { ProviderAdapterDefinition } from './types';

export { openAiCompatibleProviderDefinition } from '../../providers/openai-compatible/definition';
export { comfyUiProviderDefinition } from '../../providers/comfyui/definition';

export const providerAdapterDefinitions = [openAiCompatibleProviderDefinition, comfyUiProviderDefinition] satisfies ProviderAdapterDefinition[];
export const providerAdapterDefinitionsById = new Map(providerAdapterDefinitions.map((definition) => [definition.id, definition]));

export function listProviderAdapterDefinitions(): ProviderAdapterDefinition[] {
  return providerAdapterDefinitions;
}

export function isKnownProviderAdapterId(adapterId: string | null | undefined): boolean {
  return Boolean(adapterId && providerAdapterDefinitionsById.has(adapterId));
}

export function getProviderAdapterDefinition(adapterId: string | null | undefined): ProviderAdapterDefinition {
  if (!adapterId) return openAiCompatibleProviderDefinition;
  return providerAdapterDefinitionsById.get(adapterId) ?? openAiCompatibleProviderDefinition;
}

export function getProviderAdapterForSettings(provider: Pick<ProviderSettings, 'adapterId'> | null | undefined): ProviderAdapterDefinition {
  return getProviderAdapterDefinition(provider?.adapterId);
}
