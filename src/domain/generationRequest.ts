import type { ImageParams } from './imageParams';
import type { ProviderGenerationModeId } from './providerMode';
import type { WorkMode } from './workMode';

export interface ComposerRequestDraft {
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
  params: Partial<Pick<ImageParams,
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
