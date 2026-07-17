import { createBuiltInIntegrationRegistry } from './integrations/builtins';
import { defaultIntegrationRegistry, type IntegrationRegistryPort } from './integrations/registry';
import {
  getProviderAdapter,
  parseProviderSettings,
  providerAdaptersById,
  providerServerManifests,
  providerServerManifestsById
} from './providers/registry';
import type { ProviderAdapterDefinition, ProviderSettings } from './providers/types';
import {
  defaultGenerationTaskRuntimePort,
  type GenerationTaskRuntimePort
} from './processes/generation-task-runtime/runtimePort';

export interface ProviderRegistryPort {
  manifests: typeof providerServerManifests;
  manifestsById: typeof providerServerManifestsById;
  adaptersById: typeof providerAdaptersById;
  defaultAdapterId: string;
  getAdapter(adapterId: string | null | undefined): ProviderAdapterDefinition;
  parseSettings(value: unknown): ProviderSettings;
}

export interface BackendAppContext {
  providers: ProviderRegistryPort;
  integrations: IntegrationRegistryPort;
  generationTasks: GenerationTaskRuntimePort;
}

export function createProviderRegistryPort(): ProviderRegistryPort {
  return {
    manifests: providerServerManifests,
    manifestsById: providerServerManifestsById,
    adaptersById: providerAdaptersById,
    defaultAdapterId: 'openai-compatible',
    getAdapter: getProviderAdapter,
    parseSettings: parseProviderSettings
  };
}

export function createBackendAppContext(): BackendAppContext {
  const preconfiguredIntegrations = defaultIntegrationRegistry.list();
  return {
    providers: createProviderRegistryPort(),
    integrations: preconfiguredIntegrations.length > 0 ? defaultIntegrationRegistry : createBuiltInIntegrationRegistry(),
    generationTasks: defaultGenerationTaskRuntimePort
  };
}
