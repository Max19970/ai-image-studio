import type { BatchComposerDraft } from '../../domain/generationTask';
import type { ProviderGenerationModeId } from '../../domain/providerMode';
import type { WorkMode } from '../../domain/workMode';

export type ProviderCompatibilityChange = 'mode' | 'providerMode' | 'imageAttachments' | 'mask';

export interface GenerationDraftCompatibilityShape {
  mode: WorkMode;
  targetImage: File | null;
  referenceImages: File[];
  mask: File | null;
}

export interface ProviderModeDraftCompatibilityShape {
  providerModeId: ProviderGenerationModeId;
  targetImage: File | null;
  referenceImages: File[];
  mask: File | null;
}

export interface ProviderCompatibilityResult<T> {
  value: T;
  changed: boolean;
  changes: ProviderCompatibilityChange[];
}

export type BatchDraftCompatibilityResult = ProviderCompatibilityResult<BatchComposerDraft>;

export function uniqueCompatibilityChanges(changes: ProviderCompatibilityChange[]): ProviderCompatibilityChange[] {
  return Array.from(new Set(changes));
}
