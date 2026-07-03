import { enqueueServerGenerationRequest } from '../../infrastructure/api/generationTasks';
import type { GenerationTask } from '../../domain/generationTask';
import type { SingleGenerationEventSink } from './events';
import { captureRequestSnapshot } from './requestSnapshots';
import type { SingleGenerationRunInput } from './types';

export interface SingleGenerationSubmission {
  taskId: string;
  task?: GenerationTask;
}

export async function runSingleGeneration(input: SingleGenerationRunInput, onEvent?: SingleGenerationEventSink): Promise<SingleGenerationSubmission> {
  const {
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
  } = input;

  const snapshot = captureRequestSnapshot({
    mode,
    providerMode,
    providerModeLabel: t(providerMode.labelKey),
    params,
    provider,
    activeProvider,
    activeModel,
    payload,
    warnings,
    targetImage,
    referenceImages,
    mask,
    fallbackProviderLabel: t('app.localProvider')
  });

  const submission = await enqueueServerGenerationRequest({
    mode,
    providerMode,
    provider,
    payload,
    targetImage,
    referenceImages,
    mask,
    snapshot,
    galleryPath
  });

  onEvent?.({ type: 'queued', taskId: submission.taskId, request: snapshot });
  return submission;
}
