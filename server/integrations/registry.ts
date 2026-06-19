import type { IntegrationAdapterMetadata, IntegrationRuntimeAdapter } from './types';

const adaptersById = new Map<string, IntegrationRuntimeAdapter>();

export function registerIntegrationAdapter(adapter: IntegrationRuntimeAdapter): void {
  if (!adapter.id.trim()) throw new Error('Integration adapter id is required.');
  if (adaptersById.has(adapter.id)) throw new Error(`Integration adapter already registered: ${adapter.id}`);
  adaptersById.set(adapter.id, adapter);
}

export function unregisterIntegrationAdapter(id: string): void {
  adaptersById.delete(id);
}

export function clearIntegrationAdaptersForTests(): void {
  adaptersById.clear();
}

export function listIntegrationAdapters(): IntegrationRuntimeAdapter[] {
  return [...adaptersById.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export function listIntegrationAdapterMetadata(): IntegrationAdapterMetadata[] {
  return listIntegrationAdapters().map(({ id, label, description, supportsRuntime }) => ({
    id,
    label,
    description,
    supportsRuntime
  }));
}

export function getIntegrationAdapter(id: string): IntegrationRuntimeAdapter | null {
  return adaptersById.get(id) ?? null;
}

export function requireIntegrationAdapter(id: string): IntegrationRuntimeAdapter {
  const adapter = getIntegrationAdapter(id);
  if (!adapter) throw new Error(`Unknown integration adapter: ${id || 'empty id'}`);
  return adapter;
}
