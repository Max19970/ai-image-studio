import type { ProviderServerManifest } from '../manifest';
import { openAiCompatibleProviderAdapter } from './adapter';

export const openAiCompatibleProviderServerManifest: ProviderServerManifest = {
  id: 'openai-compatible',
  adapter: openAiCompatibleProviderAdapter,
  architecture: {
    basePath: 'server/providers/openai-compatible',
    requiredModules: [
      'adapter.ts',
      'auth.ts',
      'endpoints.ts',
      'errorNormalizer.ts',
      'fixtureImage.ts',
      'multipartEdit.ts',
      'probeSuite.ts',
      'probeClassifier.ts',
      'requestHandlers.ts',
      'settingsSchema.ts',
      'submitOperation.ts',
      'upstreamClient.ts'
    ],
    compositionFile: 'adapter.ts',
    maxCompositionLines: 80,
    forbiddenCompositionPhrases: ['node:zlib', 'makePng(', 'fetch('],
    requiredCompositionPhrases: [
      'capabilities: {',
      'resources: {',
      'settingsSchema: openAiCompatibleProviderSettingsSchema'
    ]
  }
};
