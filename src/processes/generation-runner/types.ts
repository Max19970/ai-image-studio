import type { GenerationModel, GenerationProvider, ProviderSettings } from '../../domain/providerSettings';
import type { ImageParams } from '../../domain/imageParams';
import type { ProviderGenerationModeDefinition } from '../../domain/providerMode';
import type { WorkMode } from '../../domain/workMode';

export type RunnerTranslateFn = (key: string, vars?: Record<string, string | number | boolean | null | undefined>) => string;

export interface SingleGenerationRunInput {
  mode: WorkMode;
  providerMode: ProviderGenerationModeDefinition;
  params: ImageParams;
  provider: ProviderSettings;
  activeProvider: GenerationProvider | null;
  activeModel: GenerationModel | null;
  payload: Record<string, unknown>;
  warnings: string[];
  targetImage: File | null;
  referenceImages: File[];
  mask: File | null;
  t: RunnerTranslateFn;
  galleryPath?: string;
}
