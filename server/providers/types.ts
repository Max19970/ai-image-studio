import { z } from 'zod';
import type { GeneratedImage, GenerationProgress } from '../../src/domain/generationTask';

export const ProviderSchema = z.object({
  adapterId: z.string().default('openai-compatible'),
  generationEndpoint: z.string().url().optional(),
  editEndpoint: z.string().url().optional(),
  responsesEndpoint: z.string().url().optional(),
  apiKey: z.string().optional(),
  modelId: z.string().optional(),
  authHeaderName: z.string().default('Authorization'),
  authScheme: z.string().default('Bearer'),
  customHeadersJson: z.string().optional(),
  timeoutMs: z.number().int().min(1_000).max(900_000).default(240_000),
  persistApiKey: z.boolean().optional()
});

export type ProviderSettings = z.infer<typeof ProviderSchema>;
export type UploadedFile = Express.Multer.File;

export type ProviderOperationKind = 'generate' | 'edit';
export type ProviderSubmitTransportKind = 'json' | 'multipart';
export type ProviderSubmitTransportOperation = ProviderOperationKind | 'provider-submit';

export interface ProviderSubmitTransportDefinition {
  kind: ProviderSubmitTransportKind;
  operation: ProviderSubmitTransportOperation;
  path?: string;
}

export type ProviderResourceKind = 'models' | 'checkpoints' | 'loras' | 'samplers' | 'schedulers' | 'upscale_models' | (string & {});
export type ProbeStatus = 'accepted' | 'rejected' | 'error' | 'unknown';

export interface ProviderRuntimeCapabilities {
  supportsGenerate: boolean;
  supportsEdit: boolean;
  supportsImageAttachments: boolean;
  supportsMask: boolean;
  supportsStreaming: boolean;
  usesLocalWorkflow: boolean;
  hasLiveResources: boolean;
}

export interface ProviderResourceDescriptor {
  kinds: readonly ProviderResourceKind[];
}

export interface ProviderResourceEntry {
  id: string;
  name: string;
  nativeName?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface ProviderResourceList {
  kind: ProviderResourceKind;
  providerLabel: string;
  createdAt: number;
  items: ProviderResourceEntry[];
  warning?: string;
}

export type ProbeEntry = {
  supported: boolean;
  status: ProbeStatus;
  message?: string;
  testedValue?: unknown;
};

export type ProbeReport = {
  fingerprint: string;
  createdAt: number;
  providerLabel: string;
  caveat?: string;
  baseline: {
    generation: ProbeEntry;
    edit: ProbeEntry;
    unknownParamControlGeneration?: ProbeEntry;
    unknownParamControlEdit?: ProbeEntry;
  };
  generation: Record<string, ProbeEntry>;
  edit: Record<string, ProbeEntry>;
};

export type ProviderQuickCheckResult = {
  ok: boolean;
  status: number | null;
  message: string;
  createdAt: number;
};

export type UpstreamRequestResult = {
  endpoint: string;
  upstream: Response;
};

export type ProviderPreviewStreamMode = 'full' | 'throttled' | 'off';

export interface ProviderResponseAdapter {
  collectImagesFromJson(json: unknown, fallbackFormat?: string): GeneratedImage[];
  collectProgressFromJson?(json: unknown): GenerationProgress | null;
  collectErrorFromJson?(json: unknown): string | null;
  parseSseBlock(block: string): unknown[];
}

export interface ProviderStreamDecisionInput {
  payload: Record<string, unknown>;
  provider: ProviderSettings;
}

export interface ProviderRuntimeResponsePolicy {
  adapter: ProviderResponseAdapter;
  compactRaw?(raw: unknown): unknown;
  shouldStream?(input: ProviderStreamDecisionInput): boolean;
}

export interface ProviderFetchContext {
  signal?: AbortSignal;
  previewStreamMode?: ProviderPreviewStreamMode;
  runtimeTraceId?: string;
}

export interface ProviderModeSubmitInput {
  provider: ProviderSettings;
  providerModeId?: string | null;
  transport?: ProviderSubmitTransportDefinition | null;
  payload: Record<string, unknown>;
  files: UploadedFile[];
  context?: ProviderFetchContext;
}

export interface ProviderAdapterDefinition {
  id: string;
  label: string;
  resolveEndpoint(provider: ProviderSettings, kind: ProviderOperationKind): string;
  fingerprint(provider: ProviderSettings): string;
  capabilities: ProviderRuntimeCapabilities;
  resources: ProviderResourceDescriptor;
  response: ProviderRuntimeResponsePolicy;
  submitProviderMode(input: ProviderModeSubmitInput): Promise<UpstreamRequestResult>;
  fetchGenerate(provider: ProviderSettings, payload: Record<string, unknown>, context?: ProviderFetchContext): Promise<UpstreamRequestResult>;
  fetchEdit(provider: ProviderSettings, payload: Record<string, unknown>, files: UploadedFile[], context?: ProviderFetchContext): Promise<UpstreamRequestResult>;
  fetchResources?(provider: ProviderSettings, kind: ProviderResourceKind): Promise<ProviderResourceList>;
  quickCheck(provider: ProviderSettings): Promise<ProviderQuickCheckResult>;
  probe(provider: ProviderSettings): Promise<ProbeReport>;
  settingsSchema: z.ZodType<ProviderSettings>;
}

