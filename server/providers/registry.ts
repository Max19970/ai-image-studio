import { openAiCompatibleProviderAdapter } from './openai-compatible/adapter';
import type { ProviderAdapterDefinition } from './types';

const adapters = [openAiCompatibleProviderAdapter] satisfies ProviderAdapterDefinition[];

export const providerAdaptersById = new Map(adapters.map((adapter) => [adapter.id, adapter]));

export function getProviderAdapter(adapterId = openAiCompatibleProviderAdapter.id): ProviderAdapterDefinition {
  const adapter = providerAdaptersById.get(adapterId);
  if (!adapter) {
    console.warn(`[providers] Unknown adapter "${adapterId}". Falling back to ${openAiCompatibleProviderAdapter.id}.`);
    return openAiCompatibleProviderAdapter;
  }
  return adapter;
}
