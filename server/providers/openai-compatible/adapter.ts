import type { ProviderAdapterDefinition } from '../types';
import { resolveOpenAiCompatibleEndpoint, providerFingerprint } from './endpoints';
import {
  fetchOpenAiCompatibleEdit,
  fetchOpenAiCompatibleGenerate,
  submitOpenAiCompatibleProviderMode
} from './requestHandlers';
import { probeOpenAiCompatibleProvider, quickCheckOpenAiCompatibleProvider } from './probeSuite';
import { openAiCompatibleProviderSettingsSchema } from './settingsSchema';
import { compactOpenAiCompatibleResponseRaw, openAiCompatibleResponseAdapter } from './responseAdapter';

export const openAiCompatibleProviderAdapter: ProviderAdapterDefinition = {
  id: 'openai-compatible',
  label: 'OpenAI-compatible Images API',
  resolveEndpoint: resolveOpenAiCompatibleEndpoint,
  fingerprint: providerFingerprint,
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
  response: {
    adapter: openAiCompatibleResponseAdapter,
    compactRaw: compactOpenAiCompatibleResponseRaw,
    shouldStream: ({ payload }) => payload.stream === true
  },
  submitProviderMode: submitOpenAiCompatibleProviderMode,
  fetchGenerate: fetchOpenAiCompatibleGenerate,
  fetchEdit: fetchOpenAiCompatibleEdit,
  quickCheck: quickCheckOpenAiCompatibleProvider,
  probe: probeOpenAiCompatibleProvider,
  settingsSchema: openAiCompatibleProviderSettingsSchema
};
