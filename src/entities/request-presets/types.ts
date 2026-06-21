import type { ImageParams } from '../../domain/imageParams';
import type { ProviderGenerationModeId } from '../../domain/providerMode';

export interface RequestPresetSnapshot {
  providerModeId: ProviderGenerationModeId;
  selectedModelId: string;
  params: ImageParams;
}

export interface RequestPresetDisplayMeta {
  providerId?: string;
  providerLabel?: string;
  modelId?: string;
  modelLabel?: string;
  providerModeLabel?: string;
}

export interface RequestPreset {
  id: string;
  name: string;
  note: string;
  createdAt: number;
  updatedAt: number;
  snapshot: RequestPresetSnapshot;
  meta: RequestPresetDisplayMeta;
}

export interface CreateRequestPresetInput {
  name?: string;
  note?: string;
  snapshot: RequestPresetSnapshot;
  meta?: RequestPresetDisplayMeta;
  now?: number;
}

export interface UpdateRequestPresetInput {
  name?: string;
  note?: string;
  snapshot?: RequestPresetSnapshot;
  meta?: RequestPresetDisplayMeta;
  now?: number;
}
