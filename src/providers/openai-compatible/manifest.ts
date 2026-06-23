import type { ProviderClientManifest } from '../../entities/provider/manifest';
import { openAiCompatibleProviderDefinition } from './definition';

export const openAiCompatibleProviderClientManifest: ProviderClientManifest = {
  id: 'openai-compatible',
  definition: openAiCompatibleProviderDefinition,
  architecture: {
    basePath: 'src/providers/openai-compatible',
    requiredModules: [
      'definition.ts',
      'manifest.ts',
      'parameterProfile.ts',
      'requestAdapter.ts',
      'responseAdapter.ts',
      'responseImages.ts',
      'settingsSchema.ts',
      'submitProxyRequest.ts'
    ],
    compositionFile: 'definition.ts',
    maxCompositionLines: 90,
    requiredCompositionPhrases: [
      'settingsFields: openAiCompatibleSettingsFields',
      'generationParams: openAiCompatibleGenerationParamProfile',
      'capabilities: {',
      'resources: {',
      'generationSurface: {',
      'detailDescriptor: {'
    ]
  }
};
