import type { ProviderClientManifest } from '../../entities/provider/manifest';
import { comfyUiProviderDefinition } from './definition';

export const comfyUiProviderClientManifest: ProviderClientManifest = {
  id: 'comfyui',
  definition: comfyUiProviderDefinition,
  architecture: {
    basePath: 'src/providers/comfyui',
    requiredModules: [
      'definition.ts',
      'manifest.ts',
      'requestAdapter.ts',
      'responseAdapter.ts',
      'settingsSchema.ts'
    ],
    compositionFile: 'definition.ts',
    maxCompositionLines: 90,
    requiredCompositionPhrases: [
      'supportsMultipartEdit: false',
      "kind: 'provider-owned'",
      "kind: 'local-workflow'",
      'showLoraRegistry: true',
      "modelResourceKind: 'checkpoints'"
    ]
  }
};
