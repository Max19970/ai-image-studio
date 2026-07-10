import type { ProviderAdapterDefinition } from '../types';
import { comfyUiProviderSettingsSchema } from './settingsSchema';
import { resolveComfyUiEndpoint, comfyUiProviderFingerprint } from './endpoints';
import { fetchComfyUiEdit, fetchComfyUiGenerate, submitComfyUiProviderMode } from './requestHandlers';
import { probeComfyUiProvider, quickCheckComfyUiProvider } from './probeSuite';
import { comfyUiResourceKinds, fetchComfyUiResources } from './resources';
import { comfyUiResponseAdapter } from './responseAdapter';

export const comfyUiProviderAdapter: ProviderAdapterDefinition = {
  id: 'comfyui',
  label: 'ComfyUI Local Workflow',
  resolveEndpoint: resolveComfyUiEndpoint,
  fingerprint: comfyUiProviderFingerprint,
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
    kinds: comfyUiResourceKinds
  },
  response: {
    adapter: comfyUiResponseAdapter,
    shouldStream: () => true
  },
  submitProviderMode: submitComfyUiProviderMode,
  fetchGenerate: fetchComfyUiGenerate,
  fetchEdit: fetchComfyUiEdit,
  fetchResources: fetchComfyUiResources,
  quickCheck: quickCheckComfyUiProvider,
  probe: probeComfyUiProvider,
  settingsSchema: comfyUiProviderSettingsSchema
};
