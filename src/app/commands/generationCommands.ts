import type { BatchComposerDraft } from '../../domain/generationTask';
import type { GenerationModel, GenerationProvider, ProviderSettings } from '../../domain/providerSettings';
import type { ImageParams } from '../../domain/imageParams';
import type { ProviderProbeReport } from '../../domain/providerProbe';
import type { StudioSettings } from '../../domain/studioSettings';
import type { WorkMode } from '../../domain/workMode';
import { runBatchGeneration } from '../../processes/batch-runner/batchRunner';
import { runSingleGeneration } from '../../processes/generation-runner/singleRunner';
import type { StateSetter, TaskHistoryCommands, TranslateFn } from './types';

interface SingleGenerationCommandArgs {
  canSubmit: boolean;
  mode: WorkMode;
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
    t
  } = args;

  if (!canSubmit) return;
  setBusy(true);
  try {
    await runSingleGeneration({
      mode,
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
    await runBatchGeneration({
      drafts,
      intervalSeconds,
      settings,
      selectedModelId,
      capabilityReport,
      taskHistory,
      t
    });
  } finally {
    setBusy(false);
  }
}
