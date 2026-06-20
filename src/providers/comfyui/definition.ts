import { modelCapabilitiesFromProbeReport } from '../../entities/provider/capabilities';
import type { ProviderAdapterDefinition } from '../../entities/provider/types';
import { comfyUiRequestAdapter } from './requestAdapter';
import { comfyUiResponseAdapter } from './responseAdapter';
import { comfyUiSettingsFields } from './settingsSchema';
import {
  comfyUiDetailSurfaceId,
  comfyUiGenerationModes
} from '../../entities/generation-params/comfyui/modes';

export const comfyUiProviderDefinition: ProviderAdapterDefinition = {
  id: 'comfyui',
  label: 'ComfyUI Local Workflow',
  description: 'Local text-to-image workflow generation through a running ComfyUI server.',
  defaultGenerationEndpoint: 'http://127.0.0.1:8188',
  defaultEditEndpoint: 'http://127.0.0.1:8188',
  supportsMultipartEdit: false,
  capabilities: {
    supportsGenerate: true,
    supportsEdit: false,
    supportsImageAttachments: false,
    supportsMask: false,
    supportsStreaming: false,
    usesLocalWorkflow: true,
    hasLiveResources: true
  },
  resources: {
    kinds: ['models', 'checkpoints', 'loras', 'samplers', 'schedulers', 'upscale_models']
  },
  generationSurface: {
    id: 'comfyui.text-to-image',
    kind: 'provider-owned',
    description: 'Uses a provider-owned ComfyUI workflow surface.'
  },
  detailDescriptor: {
    id: comfyUiDetailSurfaceId,
    kind: 'provider-owned',
    label: 'ComfyUI workflow parameters'
  },
  controlSurface: {
    id: 'comfyui.local-workflow-controls',
    kind: 'local-workflow',
    showModeSwitcher: false,
    showImageAttachments: false,
    showMask: false,
    showLoraRegistry: true,
    showParameters: true,
    showBatch: true
  },
  generationModes: [...comfyUiGenerationModes],
  settingsFields: comfyUiSettingsFields,
  modelResourceKind: 'checkpoints',
  generationParams: {
    id: 'comfyui.provider-owned',
    include: ['generationParam.retryPolicy']
  },
  capabilitiesFromProbe: modelCapabilitiesFromProbeReport,
  request: comfyUiRequestAdapter,
  response: comfyUiResponseAdapter
};
