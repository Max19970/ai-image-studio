import { attachSnapshot } from '../../domain/generationSnapshots';
import type { GenerationTask } from '../../domain/generationTask';
import { submitImageRequest } from '../../infrastructure/api';
import { transitionTask } from '../generation-task-lifecycle';
import { createRunnerAbortController, normalizeRunnerFailure, releaseRunnerAbortController } from './cancellation';
import type { SingleGenerationEventSink } from './events';
import { mapSingleGenerationFinalImages } from './resultMapper';
import { createRunnerRetryPolicy, runWithRetryPolicy } from './retryPolicy';
import { captureRequestSnapshot } from './requestSnapshots';
import type { SingleGenerationRunInput } from './types';

export async function runSingleGeneration(input: SingleGenerationRunInput, onEvent?: SingleGenerationEventSink) {
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
    taskHistory,
    t
  } = input;

  const taskId = crypto.randomUUID();
  const controller = createRunnerAbortController(taskId, taskHistory);

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

  const taskCreatedAt = Date.now();
  const task: GenerationTask = {
    id: taskId,
    kind: 'single',
    status: 'queued',
    createdAt: taskCreatedAt,
    updatedAt: taskCreatedAt,
    request: snapshot,
    images: []
  };

  taskHistory.setTasks((prev) => [task, ...prev]);
  onEvent?.({ type: 'queued', taskId, request: snapshot });

  try {
    taskHistory.updateTask(taskId, (current) => transitionTask(current, { status: 'sending', error: null }));
    onEvent?.({ type: 'started', taskId });

    const result = await runWithRetryPolicy({
      policy: createRunnerRetryPolicy({ attempts: params.retryAttempts, delaySeconds: params.retryDelaySeconds }),
      run: () => {
        taskHistory.updateTask(taskId, (current) => transitionTask(current, { status: 'running', error: null }));
        return submitImageRequest({
          provider,
          payload,
          mode,
          providerMode,
          targetImage,
          referenceImages,
          mask,
          signal: controller.signal,
          onStreamImage: (image) => {
            const attached = attachSnapshot([image], snapshot, taskId)[0];
            taskHistory.updateTask(taskId, (current) => ({
              ...transitionTask(current, { status: 'running' }),
              images: [...current.images, attached]
            }));
            onEvent?.({ type: 'streaming', taskId, image: attached });
          }
        });
      },
      onRetry: ({ attempt, totalAttempts, error, waitMs }) => {
        taskHistory.updateTask(taskId, (current) => transitionTask(current, {
          status: 'retrying',
          error: t('app.retryWaiting', { attempt, total: totalAttempts, seconds: Math.round(waitMs / 1000), error })
        }));
        onEvent?.({ type: 'retrying', taskId, attempt, totalAttempts, error, waitMs });
      },
      signal: controller.signal
    });

    const finalImages = mapSingleGenerationFinalImages({
      result,
      request: snapshot,
      taskId,
      streamed: payload.stream === true
    });

    taskHistory.updateTask(taskId, (current) => ({
      ...transitionTask(current, { status: 'succeeded', error: null }),
      images: finalImages ?? current.images,
      raw: result.raw
    }));
    onEvent?.({ type: 'succeeded', taskId, status: 'succeeded', imageCount: finalImages?.length ?? result.images.length });
  } catch (error) {
    const failure = normalizeRunnerFailure(error, t);
    taskHistory.updateTask(taskId, (current) => transitionTask(current, {
      status: failure.cancelled ? 'cancelled' : 'failed',
      error: failure.message
    }));
    onEvent?.(
      failure.cancelled
        ? { type: 'cancelled', taskId, status: 'cancelled', error: failure.message }
        : { type: 'failed', taskId, status: 'failed', error: failure.message }
    );
  } finally {
    releaseRunnerAbortController(taskId, taskHistory);
  }
}
