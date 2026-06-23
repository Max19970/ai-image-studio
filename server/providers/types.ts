import { z } from 'zod';

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

export class HttpError extends Error {
  constructor(message: string, readonly statusCode: number) {
    super(message);
  }
}

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
  submitProviderMode(input: ProviderModeSubmitInput): Promise<UpstreamRequestResult>;
  fetchGenerate(provider: ProviderSettings, payload: Record<string, unknown>, context?: ProviderFetchContext): Promise<UpstreamRequestResult>;
  fetchEdit(provider: ProviderSettings, payload: Record<string, unknown>, files: UploadedFile[], context?: ProviderFetchContext): Promise<UpstreamRequestResult>;
  fetchResources?(provider: ProviderSettings, kind: ProviderResourceKind): Promise<ProviderResourceList>;
  quickCheck(provider: ProviderSettings): Promise<ProviderQuickCheckResult>;
  probe(provider: ProviderSettings): Promise<ProbeReport>;
  settingsSchema: z.ZodType<ProviderSettings>;
}

export const ProviderResourceRequestSchema = z.object({
  provider: z.unknown(),
  kind: z.string().min(1)
});

export function env(name: string, fallback = ''): string {
  return process.env[name] || fallback;
}

export function compactCause(error: unknown): string | undefined {
  const anyError = error as any;
  const cause = anyError?.cause;
  const parts: string[] = [];

  if (anyError?.name && anyError.name !== 'Error') parts.push(String(anyError.name));
  if (anyError?.code) parts.push(String(anyError.code));

  if (cause && typeof cause === 'object') {
    if ((cause as any).code) parts.push(String((cause as any).code));
    if ((cause as any).syscall) parts.push(String((cause as any).syscall));
    if ((cause as any).hostname) parts.push(String((cause as any).hostname));
    if ((cause as any).address) parts.push(String((cause as any).address));
    if ((cause as any).port) parts.push(String((cause as any).port));
    if ((cause as any).message) parts.push(String((cause as any).message));
  } else if (typeof cause === 'string') {
    parts.push(cause);
  }

  return [...new Set(parts.filter(Boolean))].join(' · ') || undefined;
}

export function normalizePayload(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Payload must be a JSON object.');
  }
  return payload as Record<string, unknown>;
}

export function validatePromptPayload(payload: Record<string, unknown>) {
  if (typeof payload.prompt !== 'string' || payload.prompt.trim().length === 0) {
    throw new HttpError('Prompt is required before sending the image request.', 400);
  }
}
