import type { ComposerRequestDraft } from '../../domain/generationTask';
import type { GenerationModel, GenerationProvider, ProviderSettings } from '../../domain/providerSettings';
import type { ImageParams } from '../../domain/imageParams';
import type { ProviderProbeReport } from '../../domain/providerProbe';
import type { ProviderGenerationModeDefinition } from '../../domain/providerMode';
import type { StudioSettings } from '../../domain/studioSettings';
import type { WorkMode } from '../../domain/workMode';
import { enqueueServerBatchGenerationRequest, enqueueServerGenerationRequest } from '../../processes/server-generation-actions';
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
  taskHistory: Pick<TaskHistoryCommands, 'ingestServerTask'>;
  setBusy: StateSetter<boolean>;
  setServerSubmission: ServerSubmissionSetter;
  t: TranslateFn;
  galleryPath: string;
}

interface ComposerDraftSubmissionCommandArgs {
  drafts: ComposerRequestDraft[];
  intervalSeconds: number;
  settings: StudioSettings;
  selectedModelId: string;
  capabilityReport: ProviderProbeReport | null;
  setBusy: StateSetter<boolean>;
  setServerSubmission: ServerSubmissionSetter;
  taskHistory: Pick<TaskHistoryCommands, 'ingestServerTask'>;
  t: TranslateFn;
  galleryPath: string;
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
    t,
    galleryPath
  } = args;

  if (!canSubmit) return;
  setBusy(true);
  setServerSubmission({ phase: 'submitting' });
  try {
    const submission = await runSingleGeneration({
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
      t,
      galleryPath
    });
    if (submission.task) {
      taskHistory.ingestServerTask(submission.task);
      setServerSubmission({ phase: 'idle' });
    } else {
      setServerSubmission({ phase: 'waiting-for-event', taskId: submission.taskId });
    }
  } catch (error) {
    setServerSubmission({ phase: 'failed', error: error instanceof Error ? error.message : String(error) });
    throw error;
  } finally {
    setBusy(false);
  }
}

export async function submitComposerDraftsCommand(args: ComposerDraftSubmissionCommandArgs): Promise<string[]> {
  const {
    drafts,
    intervalSeconds,
    settings,
    selectedModelId,
    capabilityReport,
    setBusy,
    setServerSubmission,
    taskHistory,
    t,
    galleryPath
  } = args;

  const prepared = prepareBatchItems({
    drafts,
    intervalSeconds,
    settings,
    selectedModelId,
    capabilityReport,
    t
  });
  if (prepared.length === 0) return [];

  setBusy(true);
  setServerSubmission({ phase: 'submitting' });
  try {
    if (prepared.length === 1) {
      const item = prepared[0];
      const submission = await enqueueServerGenerationRequest({
        mode: item.snapshot.mode,
        providerMode: item.providerMode,
        provider: item.provider,
        payload: item.payload,
        targetImage: item.draft.targetImage,
        referenceImages: item.draft.referenceImages,
        mask: item.draft.mask,
        snapshot: item.snapshot,
        galleryPath
      });
      if (submission.task) {
        taskHistory.ingestServerTask(submission.task);
        setServerSubmission({ phase: 'idle' });
      } else {
        setServerSubmission({ phase: 'waiting-for-event', taskId: submission.taskId });
      }
      return [item.draft.id];
    }

    const intervalMs = normalizeBatchIntervalSeconds(intervalSeconds);
    await enqueueServerBatchGenerationRequest({
      intervalMs,
      galleryPath,
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
    setServerSubmission({ phase: 'idle' });
    return prepared.map((item) => item.draft.id);
  } catch (error) {
    setServerSubmission({ phase: 'failed', error: error instanceof Error ? error.message : String(error) });
    throw error;
  } finally {
    setBusy(false);
  }
}
