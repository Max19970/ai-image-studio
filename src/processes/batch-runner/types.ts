import type { BatchComposerDraft, GenerationRequestSnapshot } from '../../domain/generationTask';
import type { ProviderProbeReport } from '../../domain/providerProbe';
import type { ProviderGenerationModeDefinition } from '../../domain/providerMode';
import type { ProviderSettings } from '../../domain/providerSettings';
import type { StudioSettings } from '../../domain/studioSettings';
import type { RunnerTranslateFn } from '../generation-runner/types';

export interface PreparedBatchItem {
  draft: BatchComposerDraft;
  index: number;
  provider: ProviderSettings;
  providerMode: ProviderGenerationModeDefinition;
  payload: Record<string, unknown>;
  snapshot: GenerationRequestSnapshot;
}

export interface BatchGenerationRunInput {
  drafts: BatchComposerDraft[];
  intervalSeconds: number;
  settings: StudioSettings;
  selectedModelId: string;
  capabilityReport: ProviderProbeReport | null;
  t: RunnerTranslateFn;
}
