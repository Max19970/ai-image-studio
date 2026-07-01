import type { IntegrationAdapterMetadata, IntegrationRuntimeAdapter } from './types';

export interface IntegrationRegistryPort {
  register(adapter: IntegrationRuntimeAdapter): void;
  unregister(id: string): void;
  clearForTests(): void;
  list(): IntegrationRuntimeAdapter[];
  listMetadata(): IntegrationAdapterMetadata[];
  get(id: string): IntegrationRuntimeAdapter | null;
  require(id: string): IntegrationRuntimeAdapter;
}

export function createIntegrationRegistry(adapters: readonly IntegrationRuntimeAdapter[] = []): IntegrationRegistryPort {
  const adaptersById = new Map<string, IntegrationRuntimeAdapter>();

  const registry: IntegrationRegistryPort = {
    register(adapter) {
      if (!adapter.id.trim()) throw new Error('Integration adapter id is required.');
      if (adaptersById.has(adapter.id)) throw new Error(`Integration adapter already registered: ${adapter.id}`);
      adaptersById.set(adapter.id, adapter);
    },
    unregister(id) {
      adaptersById.delete(id);
    },
    clearForTests() {
      adaptersById.clear();
    },
    list() {
      return [...adaptersById.values()].sort((a, b) => a.label.localeCompare(b.label));
    },
    listMetadata() {
      return registry.list().map(({ id, label, description, supportsRuntime }) => ({
        id,
        label,
        description,
        supportsRuntime
      }));
    },
    get(id) {
      return adaptersById.get(id) ?? null;
    },
    require(id) {
      const adapter = registry.get(id);
      if (!adapter) throw new Error(`Unknown integration adapter: ${id || 'empty id'}`);
      return adapter;
    }
  };

  adapters.forEach((adapter) => registry.register(adapter));
  return registry;
}

export const defaultIntegrationRegistry = createIntegrationRegistry();

export function registerIntegrationAdapter(adapter: IntegrationRuntimeAdapter): void {
  defaultIntegrationRegistry.register(adapter);
}

export function unregisterIntegrationAdapter(id: string): void {
  defaultIntegrationRegistry.unregister(id);
}

export function clearIntegrationAdaptersForTests(): void {
  defaultIntegrationRegistry.clearForTests();
}

export function listIntegrationAdapters(): IntegrationRuntimeAdapter[] {
  return defaultIntegrationRegistry.list();
}

export function listIntegrationAdapterMetadata(): IntegrationAdapterMetadata[] {
  return defaultIntegrationRegistry.listMetadata();
}

export function getIntegrationAdapter(id: string): IntegrationRuntimeAdapter | null {
  return defaultIntegrationRegistry.get(id);
}

export function requireIntegrationAdapter(id: string): IntegrationRuntimeAdapter {
  return defaultIntegrationRegistry.require(id);
}
