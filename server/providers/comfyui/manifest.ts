import type { ProviderServerManifest } from '../manifest';
import { comfyUiProviderAdapter } from './adapter';

export const comfyUiProviderServerManifest: ProviderServerManifest = {
  id: 'comfyui',
  adapter: comfyUiProviderAdapter,
  architecture: {
    basePath: 'server/providers/comfyui',
    requiredModules: [
      'adapter.ts',
      'cancellation.ts',
      'endpoints.ts',
      'errorNormalizer.ts',
      'http.ts',
      'imageUpload.ts',
      'probeSuite.ts',
      'progressStream.ts',
      'requestHandlers.ts',
      'resources.ts',
      'responseMapper.ts',
      'settingsSchema.ts',
      'workflowBaseGraph.ts',
      'workflowConfig.ts',
      'workflowExtensions.ts',
      'workflowExtensionTypes.ts',
      'workflowHiresFix.ts',
      'workflowPluginValidation.ts',
      'workflowSamplerNodes.ts',
      'workflowTemplates.ts',
      'workflowTypes.ts'
    ],
    compositionFile: 'adapter.ts',
    maxCompositionLines: 90,
    forbiddenCompositionPhrases: ['fetch(', 'buildComfyUiTextToImageWorkflow('],
    requiredCompositionPhrases: [
      'supportsEdit: false',
      'usesLocalWorkflow: true',
      'hasLiveResources: true',
      'fetchResources: fetchComfyUiResources'
    ],
    sourceChecks: [
      {
        files: ['workflowBaseGraph.ts', 'workflowHiresFix.ts', 'workflowSamplerNodes.ts'],
        requiredPhrases: ['CheckpointLoaderSimple', 'KSampler', 'CLIPTextEncode', 'VAEDecode', 'SaveImage']
      }
    ]
  }
};
