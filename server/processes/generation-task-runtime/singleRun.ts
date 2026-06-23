import { attachSnapshot } from '../../../src/domain/generationSnapshots';
import type { GenerationTask } from '../../../src/domain/generationTask';
import { normalizeGalleryPath, normalizeGalleryPaths } from '../../../src/domain/galleryFilesystem';
import { finalImages, normalizeError, sortImages, transitionTask, uid, upsertLiveImage } from './imageState';
import { registerTaskController, unregisterTaskController } from './cancellation';
import { runGenerationRequestPipeline, type ServerGenerationRunInput } from './providerPipeline';
import { mutateTasks, patchTask } from './runtimeStore';

async function runTask(taskId: string, input: ServerGenerationRunInput, controller: AbortController) {
  try {
    await runGenerationRequestPipeline({
      input,
      signal: controller.signal,
      handlers: {
        attachImage: (image) => attachSnapshot([image], input.snapshot, taskId)[0],
        onSending: () => patchTask(taskId, (task) => transitionTask(task, 'sending', { error: null }), { persist: false }),
        onRunning: () => patchTask(taskId, (task) => transitionTask(task, 'running', { error: null }), { persist: false }),
        onRetry: ({ attempt, totalAttempts, error, waitMs }) => patchTask(taskId, (task) => transitionTask(task, 'retrying', {
          error: `Retry ${attempt}/${totalAttempts} in ${Math.round(waitMs / 1000)}s: ${error}`
        }), { persist: false }),
        onProgress: (progress) => patchTask(taskId, (task) => transitionTask(task, 'running', { progress }), { persist: false }),
        onImage: (image) => patchTask(taskId, (task) => transitionTask(task, 'running', {
          images: upsertLiveImage(task.images, image)
        }), { persist: image.kind === 'final' }),
        onSucceeded: ({ images, raw, streamed }) => patchTask(taskId, (task) => {
          const final = streamed && images.length === 0 ? sortImages(finalImages(task.images)) : sortImages(images);
          return transitionTask(task, 'succeeded', { images: final, raw: streamed ? undefined : raw, error: null, progress: null });
        }),
        onFailed: (error, cancelled) => patchTask(taskId, (task) => transitionTask(task, cancelled ? 'cancelled' : 'failed', { error: normalizeError(error), progress: null }))
      }
    });
  } finally {
    unregisterTaskController(taskId);
  }
}

export async function startServerGenerationRun(input: ServerGenerationRunInput): Promise<GenerationTask> {
  const taskId = uid('task');
  const createdAt = Date.now();
  const controller = new AbortController();
  const task: GenerationTask = {
    id: taskId,
    kind: 'single',
    status: 'queued',
    createdAt,
    updatedAt: createdAt,
    galleryPath: normalizeGalleryPath(input.galleryPath),
    galleryPaths: normalizeGalleryPaths(undefined, input.galleryPath),
    request: input.snapshot,
    images: [],
    error: null
  };

  registerTaskController(taskId, controller);
  await mutateTasks((tasks) => [task, ...tasks.filter((item) => item.id !== taskId)], { persist: false });
  void runTask(taskId, input, controller);
  return task;
}
