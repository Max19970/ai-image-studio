import { modelCapabilitiesFromProbeReport } from '../../entities/provider/capabilities';
import type { ProviderAdapterDefinition } from '../../entities/provider/types';
import { openAiCompatibleRequestAdapter } from './requestAdapter';
import { openAiCompatibleResponseAdapter } from './responseAdapter';
import { openAiCompatibleSettingsFields } from './settingsSchema';
import { openAiCompatibleGenerationParamProfile } from './parameterProfile';
import {
  openAiCompatibleDetailSurfaceId,
  openAiCompatibleGenerationModes,
  openAiCompatibleGenerationSurfaceId
} from '../../entities/generation-params/openai-compatible/modes';

export const openAiCompatibleProviderDefinition: ProviderAdapterDefinition = {
  id: 'openai-compatible',
  label: 'OpenAI-compatible Images API',
  description: 'JSON image generation plus multipart image edits through OpenAI-compatible endpoints.',
  defaultGenerationEndpoint: 'https://api.openai.com/v1/images/generations',
  defaultEditEndpoint: 'https://api.openai.com/v1/images/edits',
  supportsMultipartEdit: true,
  capabilities: {
    supportsGenerate: true,
    supportsEdit: true,
    supportsImageAttachments: true,
    supportsMask: true,
    supportsStreaming: true,
    usesLocalWorkflow: false,
    hasLiveResources: false
  },
  resources: {
    kinds: []
  },
  generationSurface: {
    id: openAiCompatibleGenerationSurfaceId,
    kind: 'logical-params',
    description: 'Uses the shared logical generation parameter registry.'
  },
  detailDescriptor: {
    id: openAiCompatibleDetailSurfaceId,
    kind: 'request-snapshot',
    label: 'OpenAI-compatible request parameters'
  },
  controlSurface: {
    id: 'openai-compatible.api-image-controls',
    kind: 'api-image',
    showModeSwitcher: true,
    showImageAttachments: true,
    showMask: true,
    showLoraRegistry: false,
    showParameters: true,
    showBatch: true
  },
  generationModes: [...openAiCompatibleGenerationModes],
  settingsFields: openAiCompatibleSettingsFields,
  generationParams: openAiCompatibleGenerationParamProfile,
  capabilitiesFromProbe: modelCapabilitiesFromProbeReport,
  request: openAiCompatibleRequestAdapter,
  response: openAiCompatibleResponseAdapter
};
