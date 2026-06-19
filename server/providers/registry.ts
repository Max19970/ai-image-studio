import { comfyUiProviderAdapter } from './comfyui/adapter';
import { openAiCompatibleProviderAdapter } from './openai-compatible/adapter';
import type { ProviderAdapterDefinition, ProviderSettings } from './types';

const adapters = [openAiCompatibleProviderAdapter, comfyUiProviderAdapter] satisfies ProviderAdapterDefinition[];

export const providerAdaptersById = new Map(adapters.map((adapter) => [adapter.id, adapter]));

export function getProviderAdapter(adapterId = openAiCompatibleProviderAdapter.id): ProviderAdapterDefinition {
  const adapter = providerAdaptersById.get(adapterId);
  if (!adapter) {
    console.warn(`[providers] Unknown adapter "${adapterId}". Falling back to ${openAiCompatibleProviderAdapter.id}.`);
    return openAiCompatibleProviderAdapter;
  }
  return adapter;
}

export function parseProviderSettings(value: unknown): ProviderSettings {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const adapterId = typeof source.adapterId === 'string' ? source.adapterId : undefined;
  const adapter = getProviderAdapter(adapterId);
  return adapter.settingsSchema.parse(source);
}
