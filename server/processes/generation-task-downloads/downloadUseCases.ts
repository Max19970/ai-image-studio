import type { GeneratedImage, GenerationTask } from '../../../src/domain/generationTask';
import { loadGenerationTaskAssetDocument, loadGenerationTaskHistoryDocuments } from '../../storage/generationTaskStore';
import {
  createTemporaryImageDownload,
  createZipArchive,
  parseImageDataUrlForDownload,
  sanitizeDownloadFilename,
  type ParsedImageDownload,
  type TemporaryImageDownload,
  type ZipDownloadEntry
} from '../../routes/generationTaskDownloadHelpers';

export interface ArchiveImageRef {
  taskId: string;
  imageId?: string;
  storageAssetKey?: string;
  filename?: string;
}

export interface DownloadUseCaseFailure {
  ok: false;
  status: number;
  message: string;
}

export interface AssetDownloadRegistration {
  ok: true;
  id: string | null;
  url: string;
  filename: string;
  expiresAt: number | null;
  mediaType: string;
}

export interface ArchiveDownloadResult {
  ok: true;
  archive: Buffer;
  filename: string;
}

export type DownloadRegistrationResult = AssetDownloadRegistration | DownloadUseCaseFailure;
export type ArchiveDownloadUseCaseResult = ArchiveDownloadResult | DownloadUseCaseFailure;

export function createGenerationTaskImageDownloadRegistration(
  input: { storageAssetKey?: unknown; src?: unknown; filename?: unknown },
  publicUrl: (path: string) => string
): DownloadRegistrationResult {
  const filename = input.filename;
  const assetKey = typeof input.storageAssetKey === 'string' ? input.storageAssetKey : '';
  if (assetKey) return createStoredAssetDownloadRegistration(assetKey, filename, publicUrl);

  const src = typeof input.src === 'string' ? input.src : '';
  const download = createTemporaryImageDownload(src, filename);
  if (!download) {
    return { ok: false, status: 422, message: 'Request body must include a downloadable image data URL.' };
  }
  return temporaryDownloadRegistration(download, publicUrl);
}

export function createGenerationTaskArchiveDownload(input: {
  taskIds?: unknown;
  imageRefs?: unknown;
  filename?: unknown;
}): ArchiveDownloadUseCaseResult {
  const requestedIds = Array.isArray(input.taskIds)
    ? input.taskIds.filter((id: unknown): id is string => typeof id === 'string')
    : [];
  const imageRefs = parseArchiveImageRefs(input.imageRefs);
  const uniqueIds = [...new Set(requestedIds)].slice(0, 200);
  if (uniqueIds.length === 0 && imageRefs.length === 0) {
    return { ok: false, status: 400, message: 'No generation tasks or images were selected for archive download.' };
  }

  const entries = collectArchiveEntries(uniqueIds, imageRefs);
  if (entries.length === 0) {
    return { ok: false, status: 422, message: 'Selected generation tasks do not contain downloadable full-size images.' };
  }

  return {
    ok: true,
    archive: createZipArchive(entries),
    filename: sanitizeDownloadFilename(input.filename || 'image-studio-selection.zip', 'zip')
  };
}

function createStoredAssetDownloadRegistration(
  assetKey: string,
  filename: unknown,
  publicUrl: (path: string) => string
): DownloadRegistrationResult {
  const image = loadGenerationTaskAssetDocument(assetKey);
  if (!image) return { ok: false, status: 404, message: 'Generation task asset not found.' };

  const parsed = parseImageDataUrlForDownload(typeof image.src === 'string' ? image.src : '');
  if (!parsed) return { ok: false, status: 422, message: 'Generation task asset is not a downloadable image data URL.' };

  const safeFilename = sanitizeDownloadFilename(filename, parsed.extension);
  const params = new URLSearchParams({ key: assetKey, filename: safeFilename });
  return {
    ok: true,
    id: null,
    url: publicUrl('/api/storage/generation-task-asset/download?' + params.toString()),
    filename: safeFilename,
    expiresAt: null,
    mediaType: parsed.mediaType
  };
}

function temporaryDownloadRegistration(
  download: TemporaryImageDownload,
  publicUrl: (path: string) => string
): AssetDownloadRegistration {
  return {
    ok: true,
    id: download.id,
    url: publicUrl('/api/storage/generation-task-downloads/' + encodeURIComponent(download.id)),
    filename: download.filename,
    expiresAt: download.expiresAt,
    mediaType: download.parsed.mediaType
  };
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

function archiveBaseName(task: GenerationTask, index: number): string {
  const prompt = task.request.prompt.trim().replace(/\s+/g, '-').replace(/[^a-zа-яё0-9._-]+/gi, '').slice(0, 42);
  return prompt || task.request.modelLabel || task.id || `task-${index + 1}`;
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

function parseArchiveImageRefs(value: unknown): ArchiveImageRef[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): ArchiveImageRef[] => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    const taskId = typeof record.taskId === 'string' ? record.taskId : '';
    const imageId = typeof record.imageId === 'string' ? record.imageId : '';
    const storageAssetKey = typeof record.storageAssetKey === 'string' ? record.storageAssetKey : '';
    const filename = typeof record.filename === 'string' ? record.filename : '';
    if (!taskId || (!imageId && !storageAssetKey)) return [];
    return [{ taskId, imageId, storageAssetKey, filename }];
  }).slice(0, 400);
}

function matchesArchiveImageRef(ref: ArchiveImageRef, task: GenerationTask, image: GeneratedImage): boolean {
  if (ref.taskId !== task.id && ref.taskId !== image.taskId) return false;
  if (ref.imageId && ref.imageId === image.id) return true;
  if (ref.storageAssetKey && ref.storageAssetKey === image.storageAssetKey) return true;
  return false;
}

function collectArchiveEntries(taskIds: string[], imageRefs: ArchiveImageRef[]): ZipDownloadEntry[] {
  const selectedIds = new Set(taskIds);
  const imageRefsByTask = new Map<string, ArchiveImageRef[]>();
  imageRefs.forEach((ref) => {
    const list = imageRefsByTask.get(ref.taskId) ?? [];
    list.push(ref);
    imageRefsByTask.set(ref.taskId, list);
  });

  const { tasks } = loadGenerationTaskHistoryDocuments({ assetMode: 'full' });
  const entries: ZipDownloadEntry[] = [];
  const usedNames = new Set<string>();
  (tasks as GenerationTask[])
    .filter((task) => selectedIds.has(task.id) || imageRefsByTask.has(task.id))
    .forEach((task, taskIndex) => {
      const refs = imageRefsByTask.get(task.id) ?? [];
      const includeAllTaskImages = selectedIds.has(task.id);
      taskImages(task).forEach((image, imageIndex) => {
        const matchedRef = includeAllTaskImages ? null : refs.find((ref) => matchesArchiveImageRef(ref, task, image));
        if (!includeAllTaskImages && !matchedRef) return;
        const parsed = parseImageDataUrlForDownload(typeof image.src === 'string' ? image.src : '');
        if (!parsed) return;
        entries.push(createArchiveEntry(usedNames, task, taskIndex, imageIndex, parsed, matchedRef?.filename));
      });
    });
  return entries;
}

function createArchiveEntry(
  usedNames: Set<string>,
  task: GenerationTask,
  taskIndex: number,
  imageIndex: number,
  parsed: ParsedImageDownload,
  requestedFilename?: string
): ZipDownloadEntry {
  const base = archiveBaseName(task, taskIndex);
  const filename = uniqueArchiveFilename(
    usedNames,
    sanitizeDownloadFilename(requestedFilename || `${base}-${imageIndex + 1}.${parsed.extension}`, parsed.extension)
  );
  return { filename, buffer: parsed.buffer };
}
