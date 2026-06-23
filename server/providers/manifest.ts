import type { ProviderAdapterDefinition } from './types';

export interface ProviderArchitectureSourceCheck {
  files: readonly string[];
  requiredPhrases?: readonly string[];
  forbiddenPhrases?: readonly string[];
}

export interface ProviderArchitectureCheckDefinition {
  basePath: string;
  requiredModules: readonly string[];
  compositionFile: string;
  maxCompositionLines: number;
  requiredCompositionPhrases?: readonly string[];
  forbiddenCompositionPhrases?: readonly string[];
  sourceChecks?: readonly ProviderArchitectureSourceCheck[];
}

export interface ProviderServerManifest {
  id: string;
  adapter: ProviderAdapterDefinition;
  architecture: ProviderArchitectureCheckDefinition;
}
