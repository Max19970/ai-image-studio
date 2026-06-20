import type { ImageParams } from './imageParams';
import type { ProviderGenerationModeId } from './providerMode';
import type { WorkMode } from './workMode';

export interface BatchComposerDraft {
  id: string;
  providerModeId: ProviderGenerationModeId;
  params: ImageParams;
  selectedModelId: string;
  targetImage: File | null;
  referenceImages: File[];
  mask: File | null;
}

export interface AttachmentSummary {
  role: 'target' | 'reference' | 'mask';
  name: string;
  size: number;
  type: string;
  previewUrl?: string;
}

export interface ProviderRequestParameterSummaryEntry {
  id: string;
  label: string;
  value: string;
  rawValue?: unknown;
}

export interface ProviderRequestParameterSummary {
  surfaceId: string;
  title: string;
  entries: ProviderRequestParameterSummaryEntry[];
}

export interface BatchAggregateRequestSnapshot {
  kind: 'batch';
  itemCount: number;
  intervalMs: number;
}

export interface GenerationRequestSnapshot {
  createdAt: number;
  mode: WorkMode;
  providerModeId?: ProviderGenerationModeId;
  providerModeLabel?: string;
  detailSurfaceId?: string;
  transportOperation?: string;
  prompt: string;
  endpoint: string;
  providerLabel: string;
  providerAdapterId?: string;
  model: string;
  modelLabel: string;
  payload: Record<string, unknown>;
  warnings: string[];
  surfaceId?: string;
  providerParams?: Record<string, unknown>;
  parameterSummary?: ProviderRequestParameterSummary;
  aggregate?: BatchAggregateRequestSnapshot;
  attachments: AttachmentSummary[];
  params: Partial<Pick<
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
    | 'responseFormat'
    | 'inputFidelity'
    | 'user'
    | 'style'
    | 'rawJson'
    | 'retryAttempts'
    | 'retryDelaySeconds'
  >>;
}

export interface GeneratedImage {
  id: string;
  taskId?: string;
  batchItemId?: string;
  batchItemIndex?: number;
  src: string;
  thumbnailSrc?: string;
  storageAssetKey?: string;
  storageThumbnailKey?: string;
  storageAssetLoaded?: boolean;
  format: string;
  kind: 'final' | 'partial';
  index: number;
  createdAt: number;
  raw?: unknown;
  request?: GenerationRequestSnapshot;
}

export type GenerationStatus = 'created' | 'queued' | 'sending' | 'running' | 'retrying' | 'succeeded' | 'failed' | 'cancelled';

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
