import type { GeneratedImage, GenerationTask } from '../../../src/domain/generationTask';
import { loadGenerationTaskHistoryDocumentsByIds } from '../../storage/generationTaskStore';
import {
  parseImageDataUrlForDownload,
  sanitizeDownloadFilename,
  type ParsedImageDownload,
  type ZipDownloadEntry
} from '../../routes/generationTaskDownloadHelpers';

export interface ArchiveImageRef {
  taskId: string;
  imageId?: string;
  storageAssetKey?: string;
  filename?: string;
}

function taskImages(task: GenerationTask): GeneratedImage[] {
  const seen = new Set<string>();
  const images: GeneratedImage[] = [];
  const add = (image: GeneratedImage) => {
    const key = image.id || image.storageAssetKey || image.src;
    if (seen.has(key)) return;
    seen.add(key);
    images.push(image);
  };
  task.images.forEach(add);
  task.batch?.items.forEach((item) => item.images.forEach(add));
  return images;
}

function timestampOf(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function archiveBaseName(task: GenerationTask, index: number): string {
  const prompt = task.request.prompt.trim().replace(/\s+/g, '-').replace(/[^a-zа-яё0-9._-]+/gi, '').slice(0, 42);
  return prompt || task.request.modelLabel || task.id || `task-${index + 1}`;
}

function preferredImageFilename(image: GeneratedImage): string {
  const raw = image.raw as { filename?: unknown; comfyui?: { filename?: unknown } } | undefined;
  const filename = image.filename ?? raw?.filename ?? raw?.comfyui?.filename;
  return typeof filename === 'string' && filename.trim() ? filename.trim() : '';
}

function uniqueArchiveFilename(used: Set<string>, filename: string): string {
  let safe = filename;
  let counter = 2;
  while (used.has(safe)) {
    safe = filename.replace(/(\.[a-z0-9]{2,5})$/i, `-${counter}$1`);
    counter += 1;
  }
  used.add(safe);
  return safe;
}

function matchesArchiveImageRef(ref: ArchiveImageRef, task: GenerationTask, image: GeneratedImage): boolean {
  if (ref.taskId !== task.id && ref.taskId !== image.taskId) return false;
  if (ref.imageId && ref.imageId === image.id) return true;
  if (ref.storageAssetKey && ref.storageAssetKey === image.storageAssetKey) return true;
  return false;
}

function createArchiveEntry(
  usedNames: Set<string>,
  task: GenerationTask,
  taskIndex: number,
  imageIndex: number,
  parsed: ParsedImageDownload,
  requestedFilename: string | undefined,
  image: GeneratedImage
): ZipDownloadEntry {
  const base = archiveBaseName(task, taskIndex);
  const filename = uniqueArchiveFilename(
    usedNames,
    sanitizeDownloadFilename(
      requestedFilename || preferredImageFilename(image) || `${base}-${imageIndex + 1}.${parsed.extension}`,
      parsed.extension
    )
  );
  return { filename, buffer: parsed.buffer };
}

export function collectGenerationTaskArchiveEntries(taskIds: string[], imageRefs: ArchiveImageRef[]): ZipDownloadEntry[] {
  const selectedIds = new Set(taskIds);
  const imageRefsByTask = new Map<string, ArchiveImageRef[]>();
  imageRefs.forEach((ref) => {
    const list = imageRefsByTask.get(ref.taskId) ?? [];
    list.push(ref);
    imageRefsByTask.set(ref.taskId, list);
  });

  const idsToLoad = [...new Set([...taskIds, ...imageRefs.map((ref) => ref.taskId)])].slice(0, 400);
  const { tasks } = loadGenerationTaskHistoryDocumentsByIds(idsToLoad, { assetMode: 'full' });
  const entries: ZipDownloadEntry[] = [];
  const usedNames = new Set<string>();

  (tasks as GenerationTask[])
    .filter((task) => selectedIds.has(task.id) || imageRefsByTask.has(task.id))
    .sort((left, right) => timestampOf(left.createdAt) - timestampOf(right.createdAt))
    .forEach((task, taskIndex) => {
      const refs = imageRefsByTask.get(task.id) ?? [];
      const includeAllTaskImages = selectedIds.has(task.id);
      taskImages(task)
        .sort((left, right) => timestampOf(left.createdAt) - timestampOf(right.createdAt))
        .forEach((image, imageIndex) => {
          const matchedRef = includeAllTaskImages ? undefined : refs.find((ref) => matchesArchiveImageRef(ref, task, image));
          if (!includeAllTaskImages && !matchedRef) return;
          const parsed = parseImageDataUrlForDownload(typeof image.src === 'string' ? image.src : '');
          if (!parsed) return;
          entries.push(createArchiveEntry(usedNames, task, taskIndex, imageIndex, parsed, matchedRef?.filename, image));
        });
    });

  return entries;
}
