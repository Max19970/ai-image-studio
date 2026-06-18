import { modelCapabilitiesFromProbeReport } from '../../entities/provider/capabilities';
import type { ProviderAdapterDefinition } from '../../entities/provider/types';
import { openAiCompatibleRequestAdapter } from './requestAdapter';
import { openAiCompatibleResponseAdapter } from './responseAdapter';
import { openAiCompatibleSettingsFields } from './settingsSchema';
import { openAiCompatibleGenerationParamProfile } from './parameterProfile';

export const openAiCompatibleProviderDefinition: ProviderAdapterDefinition = {
  id: 'openai-compatible',
  label: 'OpenAI-compatible Images API',
  description: 'JSON image generation plus multipart image edits through OpenAI-compatible endpoints.',
  defaultGenerationEndpoint: 'https://api.openai.com/v1/images/generations',
  defaultEditEndpoint: 'https://api.openai.com/v1/images/edits',
  supportsMultipartEdit: true,
  settingsFields: openAiCompatibleSettingsFields,
  generationParams: openAiCompatibleGenerationParamProfile,
  capabilitiesFromProbe: modelCapabilitiesFromProbeReport,
  request: openAiCompatibleRequestAdapter,
  response: openAiCompatibleResponseAdapter
};
