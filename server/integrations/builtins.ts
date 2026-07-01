import { createIntegrationRegistry, defaultIntegrationRegistry, type IntegrationRegistryPort } from './registry';
import type { IntegrationRuntimeAdapter } from './types';
import { telegramIntegrationAdapter } from './telegram';

export function listBuiltInIntegrationAdapters(): IntegrationRuntimeAdapter[] {
  return [telegramIntegrationAdapter];
}

export function registerBuiltInIntegrationAdapters(registry: IntegrationRegistryPort = defaultIntegrationRegistry): void {
  for (const adapter of listBuiltInIntegrationAdapters()) {
    if (!registry.get(adapter.id)) registry.register(adapter);
  }
}

export function createBuiltInIntegrationRegistry(): IntegrationRegistryPort {
  return createIntegrationRegistry(listBuiltInIntegrationAdapters());
}
