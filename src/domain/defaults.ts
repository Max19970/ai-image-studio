import type { CapabilityKey, GenerationModel, GenerationProvider, ImageParams, ProviderSettings, StudioSettings } from './types';

export const defaultProviderSettings: ProviderSettings = {
  generationEndpoint: 'https://api.openai.com/v1/images/generations',
  editEndpoint: 'https://api.openai.com/v1/images/edits',
  responsesEndpoint: 'https://api.openai.com/v1/responses',
  apiKey: '',
  modelId: 'gpt-image-2',
  authHeaderName: 'Authorization',
  authScheme: 'Bearer',
  customHeadersJson: '',
  timeoutMs: 240_000,
  persistApiKey: false
};

export const defaultGenerationProvider: GenerationProvider = {
  id: 'openai-default',
  name: 'OpenAI',
  generationEndpoint: defaultProviderSettings.generationEndpoint,
  editEndpoint: defaultProviderSettings.editEndpoint,
  responsesEndpoint: defaultProviderSettings.responsesEndpoint,
  apiKey: defaultProviderSettings.apiKey,
  authHeaderName: defaultProviderSettings.authHeaderName,
  authScheme: defaultProviderSettings.authScheme,
  customHeadersJson: defaultProviderSettings.customHeadersJson,
  timeoutMs: defaultProviderSettings.timeoutMs,
  persistApiKey: defaultProviderSettings.persistApiKey
};

export const defaultGenerationModel: GenerationModel = {
  id: 'gpt-image-2-default',
  name: 'GPT Image 2',
  providerId: defaultGenerationProvider.id,
  modelId: defaultProviderSettings.modelId,
  notes: 'Default OpenAI-compatible image model.'
};

export const defaultStudioSettings: StudioSettings = {
  providers: [defaultGenerationProvider],
  models: [defaultGenerationModel],
  selectedModelId: defaultGenerationModel.id,
  interfaceTheme: 'glass'
};

export const defaultImageParams: ImageParams = {
  prompt: '',
  n: 1,
  sizeMode: 'preset',
  sizePreset: '1024x1024',
  width: 1024,
  height: 1024,
  quality: 'high',
  background: 'auto',
  moderation: 'auto',
  outputFormat: 'png',
  outputCompression: 100,
  stream: false,
  partialImages: 0,
  responseFormat: '',
  inputFidelity: '',
  user: '',
  style: '',
  retryAttempts: 0,
  retryDelaySeconds: 4,
  rawJson: '',
  includeModel: true,
  includeN: true,
  includeQuality: true,
  includeBackground: true,
  includeModeration: true,
  includeOutputFormat: true,
  includeOutputCompression: false,
  includeStream: false,
  includePartialImages: false,
  includeResponseFormat: false,
  includeInputFidelity: false,
  includeUser: false,
  includeStyle: false
};

export const sizePresets = ['auto', '1024x1024', '1536x1024', '1024x1536', '2048x2048', '2048x1152', '1152x2048'];

export const capabilityOrder: CapabilityKey[] = [
  'model',
  'n',
  'size',
  'quality',
  'background',
  'moderation',
  'output_format',
  'output_compression',
  'stream',
  'partial_images',
  'response_format',
  'input_fidelity',
  'user',
  'style'
];

export const capabilityLabels: Record<CapabilityKey, string> = {
  model: 'model',
  n: 'n',
  size: 'size',
  quality: 'quality',
  background: 'background',
  moderation: 'moderation',
  output_format: 'output_format',
  output_compression: 'output_compression',
  stream: 'stream',
  partial_images: 'partial_images',
  response_format: 'response_format',
  input_fidelity: 'input_fidelity',
  user: 'user',
  style: 'style'
};

export const gptImage2Notes = [
  'Image Studio now stores providers and models separately, so one provider can host several registered models.',
  'Provider probe cache is still local and keyed by the effective provider + model combination.',
  'Quick check sends a minimal generation request to verify that a provider route responds at all.'
];
