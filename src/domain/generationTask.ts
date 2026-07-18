import type { GenerationRequestSnapshot } from './generationRequest';

export type {
  AttachmentSummary,
  BatchAggregateRequestSnapshot,
  ComposerRequestDraft,
  GenerationRequestSnapshot,
  ProviderRequestParameterSummary,
  ProviderRequestParameterSummaryEntry
} from './generationRequest';

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
  filename?: string;
  format: string;
  kind: 'final' | 'partial';
  index: number;
  createdAt: number;
  raw?: unknown;
  request?: GenerationRequestSnapshot;
}

export interface GenerationProgress {
  providerAdapterId?: string;
  percent?: number | null;
  step?: number | null;
  maxSteps?: number | null;
  stage?: string | null;
  nodeId?: string | null;
  message?: string | null;
  updatedAt: number;
}

export type GenerationStatus = 'created' | 'queued' | 'sending' | 'running' | 'retrying' | 'succeeded' | 'failed' | 'cancelled' | (string & {});

export interface BatchGenerationItem {
  id: string;
  index: number;
  status: GenerationStatus;
  request: GenerationRequestSnapshot;
  images: GeneratedImage[];
  progress?: GenerationProgress | null;
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
  galleryPath?: string;
  galleryPaths?: string[];
  createdAt: number;
  updatedAt: number;
  request: GenerationRequestSnapshot;
  images: GeneratedImage[];
  progress?: GenerationProgress | null;
  batch?: BatchGenerationSnapshot;
  raw?: unknown;
  error?: string | null;
}
