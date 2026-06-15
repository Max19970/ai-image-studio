export type WorkMode = 'generate' | 'edit';

export type OutputFormat = 'png' | 'jpeg' | 'webp';
export type Quality = '' | 'auto' | 'low' | 'medium' | 'high' | 'standard' | 'hd';
export type Background = '' | 'auto' | 'opaque' | 'transparent';
export type Moderation = '' | 'auto' | 'low';
export type ResponseFormat = '' | 'b64_json' | 'url';
export type InputFidelity = '' | 'low' | 'high';

export interface ProviderSettings {
  generationEndpoint: string;
  editEndpoint: string;
  responsesEndpoint: string;
  apiKey: string;
  modelId: string;
  authHeaderName: string;
  authScheme: string;
  customHeadersJson: string;
  timeoutMs: number;
  persistApiKey: boolean;
}

export interface GenerationProvider {
  id: string;
  name: string;
  generationEndpoint: string;
  editEndpoint: string;
  responsesEndpoint: string;
  apiKey: string;
  authHeaderName: string;
  authScheme: string;
  customHeadersJson: string;
  timeoutMs: number;
  persistApiKey: boolean;
}

export interface GenerationModel {
  id: string;
  name: string;
  providerId: string;
  modelId: string;
  notes: string;
}

export type InterfaceTheme = 'glass' | 'midnight' | 'ember' | 'meadow' | 'mono';

export interface StudioSettings {
  providers: GenerationProvider[];
  models: GenerationModel[];
  selectedModelId: string;
  interfaceTheme: InterfaceTheme;
}

export interface ImageParams {
  prompt: string;
  n: number;
  sizeMode: 'auto' | 'preset' | 'custom';
  sizePreset: string;
  width: number;
  height: number;
  quality: Quality;
  background: Background;
  moderation: Moderation;
  outputFormat: OutputFormat;
  outputCompression: number;
  stream: boolean;
  partialImages: number;
  responseFormat: ResponseFormat;
  inputFidelity: InputFidelity;
  user: string;
  style: '' | 'vivid' | 'natural';
  retryAttempts: number;
  retryDelaySeconds: number;
  rawJson: string;
  includeModel: boolean;
  includeN: boolean;
  includeQuality: boolean;
  includeBackground: boolean;
  includeModeration: boolean;
  includeOutputFormat: boolean;
  includeOutputCompression: boolean;
  includeStream: boolean;
  includePartialImages: boolean;
  includeResponseFormat: boolean;
  includeInputFidelity: boolean;
  includeUser: boolean;
  includeStyle: boolean;
}

export interface AttachmentSummary {
  role: 'target' | 'reference' | 'mask';
  name: string;
  size: number;
  type: string;
  previewUrl?: string;
}

export interface GenerationRequestSnapshot {
  createdAt: number;
  mode: WorkMode;
  prompt: string;
  endpoint: string;
  providerLabel: string;
  model: string;
  modelLabel: string;
  payload: Record<string, unknown>;
  warnings: string[];
  attachments: AttachmentSummary[];
  params: Pick<
    ImageParams,
    | 'n'
    | 'sizeMode'
    | 'sizePreset'
    | 'width'
    | 'height'
    | 'quality'
    | 'background'
    | 'moderation'
    | 'outputFormat'
    | 'outputCompression'
    | 'stream'
    | 'partialImages'
    | 'inputFidelity'
    | 'style'
    | 'retryAttempts'
    | 'retryDelaySeconds'
  >;
}

export interface GeneratedImage {
  id: string;
  taskId?: string;
  batchItemId?: string;
  batchItemIndex?: number;
  src: string;
  format: string;
  kind: 'final' | 'partial';
  index: number;
  createdAt: number;
  raw?: unknown;
  request?: GenerationRequestSnapshot;
}

export type GenerationStatus = 'queued' | 'streaming' | 'succeeded' | 'failed';

export interface BatchGenerationItem {
  id: string;
  index: number;
  status: GenerationStatus;
  request: GenerationRequestSnapshot;
  images: GeneratedImage[];
  raw?: unknown;
  error?: string | null;
}

export interface BatchGenerationSnapshot {
  intervalMs: number;
  items: BatchGenerationItem[];
}

export interface GenerationTask {
  id: string;
  kind?: 'single' | 'batch';
  status: GenerationStatus;
  createdAt: number;
  updatedAt: number;
  request: GenerationRequestSnapshot;
  images: GeneratedImage[];
  batch?: BatchGenerationSnapshot;
  raw?: unknown;
  error?: string | null;
}

export interface ApiErrorPayload {
  message: string;
  details?: unknown;
}

export type CapabilityKey =
  | 'model'
  | 'n'
  | 'size'
  | 'quality'
  | 'background'
  | 'moderation'
  | 'output_format'
  | 'output_compression'
  | 'stream'
  | 'partial_images'
  | 'response_format'
  | 'input_fidelity'
  | 'user'
  | 'style';

export interface CapabilityEntry {
  supported: boolean;
  status: 'accepted' | 'rejected' | 'error' | 'unknown';
  message?: string;
  testedValue?: unknown;
}

export interface ProviderProbeReport {
  fingerprint: string;
  createdAt: number;
  providerLabel: string;
  caveat?: string;
  baseline: {
    generation: CapabilityEntry;
    edit: CapabilityEntry;
    unknownParamControlGeneration?: CapabilityEntry;
    unknownParamControlEdit?: CapabilityEntry;
  };
  generation: Partial<Record<CapabilityKey, CapabilityEntry>>;
  edit: Partial<Record<CapabilityKey, CapabilityEntry>>;
}

export interface ProviderQuickCheckResult {
  ok: boolean;
  status: number | null;
  message: string;
  createdAt: number;
}
