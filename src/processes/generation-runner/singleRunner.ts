import { enqueueServerGenerationRequest } from '../../infrastructure/api/generationTasks';
import type { SingleGenerationEventSink } from './events';
import { captureRequestSnapshot } from './requestSnapshots';
import type { SingleGenerationRunInput } from './types';

export async function runSingleGeneration(input: SingleGenerationRunInput, onEvent?: SingleGenerationEventSink): Promise<string> {
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

  const { taskId } = await enqueueServerGenerationRequest({
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

  onEvent?.({ type: 'queued', taskId, request: snapshot });
  return taskId;
}
