import type { BatchComposerDraft } from '../../domain/generationTask';
import type { GenerationModel, GenerationProvider, ProviderSettings } from '../../domain/providerSettings';
import type { ImageParams } from '../../domain/imageParams';
import type { ProviderProbeReport } from '../../domain/providerProbe';
import type { ProviderGenerationModeDefinition } from '../../domain/providerMode';
import type { StudioSettings } from '../../domain/studioSettings';
import type { WorkMode } from '../../domain/workMode';
import { enqueueServerBatchGenerationRequest } from '../../infrastructure/api';
import { createAggregateSnapshot, prepareBatchItems } from '../../processes/batch-runner/requestBuilder';
import { normalizeBatchIntervalSeconds } from '../../processes/batch-runner/schedule';
import { runSingleGeneration } from '../../processes/generation-runner/singleRunner';
import type { ServerSubmissionSetter, StateSetter, TaskHistoryCommands, TranslateFn } from './types';

interface SingleGenerationCommandArgs {
  canSubmit: boolean;
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
  taskHistory: TaskHistoryCommands;
  setBusy: StateSetter<boolean>;
  setServerSubmission: ServerSubmissionSetter;
  t: TranslateFn;
}

interface BatchGenerationCommandArgs {
  canSubmit: boolean;
  drafts: BatchComposerDraft[];
  intervalSeconds: number;
  settings: StudioSettings;
  selectedModelId: string;
  capabilityReport: ProviderProbeReport | null;
  taskHistory: TaskHistoryCommands;
  setBusy: StateSetter<boolean>;
  setBatchComposerOpen: StateSetter<boolean>;
  t: TranslateFn;
}

export async function submitSingleGenerationCommand(args: SingleGenerationCommandArgs) {
  const {
    canSubmit,
    mode,
    providerMode,
    params,
    provider,
    activeProvider,
    activeModel,
    payload,
    warnings,
    targetImage,
    referenceImages,
    mask,
    taskHistory,
    setBusy,
    setServerSubmission,
    t
  } = args;

  if (!canSubmit) return;
  setBusy(true);
  setServerSubmission({ phase: 'submitting' });
  try {
    const taskId = await runSingleGeneration({
      mode,
      providerMode,
      params,
      provider,
      activeProvider,
      activeModel,
      payload,
      warnings,
      targetImage,
      referenceImages,
      mask,
      taskHistory,
      t
    });
    setServerSubmission({ phase: 'waiting-for-event', taskId });
  } catch (error) {
    setServerSubmission({ phase: 'failed', error: error instanceof Error ? error.message : String(error) });
    throw error;
  } finally {
    setBusy(false);
  }
}

export async function submitBatchGenerationCommand(args: BatchGenerationCommandArgs) {
  const {
    canSubmit,
    drafts,
    intervalSeconds,
    settings,
    selectedModelId,
    capabilityReport,
    taskHistory,
    setBusy,
    setBatchComposerOpen,
    t
  } = args;

  if (!canSubmit) return;
  setBusy(true);
  setBatchComposerOpen(false);
  try {
    const prepared = prepareBatchItems({
      drafts,
      intervalSeconds,
      settings,
      selectedModelId,
      capabilityReport,
      taskHistory,
      t
    });
    if (prepared.length === 0) return;

    const intervalMs = normalizeBatchIntervalSeconds(intervalSeconds);
    await enqueueServerBatchGenerationRequest({
      intervalMs,
      aggregateSnapshot: createAggregateSnapshot({ prepared, intervalMs, createdAt: Date.now(), t }),
      items: prepared.map((item) => ({
        provider: item.provider,
        payload: item.payload,
        providerMode: item.providerMode,
        snapshot: item.snapshot,
        targetImage: item.draft.targetImage,
        referenceImages: item.draft.referenceImages,
        mask: item.draft.mask,
        retryAttempts: item.draft.params.retryAttempts,
        retryDelaySeconds: item.draft.params.retryDelaySeconds
      }))
    });
  } finally {
    setBusy(false);
  }
}
