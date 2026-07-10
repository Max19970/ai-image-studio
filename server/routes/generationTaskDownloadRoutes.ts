import type express from 'express';
import type { GeneratedImage, GenerationTask } from '../../src/domain/generationTask';
import { loadGenerationTaskAssetDocument, loadGenerationTaskHistoryDocumentsByIds } from '../storage/generationTaskStore';
import { sendServerError } from '../http/errors';
import {
  absolutePublicUrl,
  createTemporaryBinaryDownload,
  createTemporaryImageDownload,
  createZipArchive,
  getTemporaryBinaryDownload,
  getTemporaryImageDownload,
  parseImageDataUrlForDownload,
  sanitizeDownloadFilename,
  sendBinaryDownloadResponse,
  sendImageDownloadResponse,
  type ZipDownloadEntry
} from './generationTaskDownloadHelpers';

interface ArchiveImageRef {
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

export function registerGenerationTaskDownloadRoutes(app: express.Express) {
  app.post('/api/storage/generation-task-downloads', (req, res) => {
    try {
      const filename = req.body?.filename;
      const assetKey = typeof req.body?.storageAssetKey === 'string' ? req.body.storageAssetKey : '';
      if (assetKey) {
        const image = loadGenerationTaskAssetDocument(assetKey);
        if (!image) {
          res.status(404).json({ error: { message: 'Generation task asset not found.' } });
          return;
        }
        const parsed = parseImageDataUrlForDownload(typeof image.src === 'string' ? image.src : '');
        if (!parsed) {
          res.status(422).json({ error: { message: 'Generation task asset is not a downloadable image data URL.' } });
          return;
        }
        const safeFilename = sanitizeDownloadFilename(filename, parsed.extension);
        const params = new URLSearchParams({ key: assetKey, filename: safeFilename });
        const url = absolutePublicUrl(req, '/api/storage/generation-task-asset/download?' + params.toString());
        res.json({ id: null, url, filename: safeFilename, expiresAt: null, mediaType: parsed.mediaType });
        return;
      }
      const src = typeof req.body?.src === 'string' ? req.body.src : '';
      const download = createTemporaryImageDownload(src, filename);
      if (!download) {
        res.status(422).json({ error: { message: 'Request body must include a downloadable image data URL.' } });
        return;
      }
      res.json({
        id: download.id,
        url: absolutePublicUrl(req, '/api/storage/generation-task-downloads/' + encodeURIComponent(download.id)),
        filename: download.filename,
        expiresAt: download.expiresAt,
        mediaType: download.parsed.mediaType
      });
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.post('/api/storage/generation-task-downloads/archive', (req, res) => {
    try {
      const requestedIds: string[] = Array.isArray(req.body?.taskIds)
        ? req.body.taskIds.filter((id: unknown): id is string => typeof id === 'string')
        : [];
      const imageRefs = parseArchiveImageRefs(req.body?.imageRefs);
      const uniqueIds = [...new Set<string>(requestedIds)].slice(0, 200);
      if (uniqueIds.length === 0 && imageRefs.length === 0) {
        res.status(400).json({ error: { message: 'No generation tasks or images were selected for archive download.' } });
        return;
      }

      const selectedIds = new Set(uniqueIds);
      const imageRefsByTask = new Map<string, ArchiveImageRef[]>();
      imageRefs.forEach((ref) => {
        const list = imageRefsByTask.get(ref.taskId) ?? [];
        list.push(ref);
        imageRefsByTask.set(ref.taskId, list);
      });
      const taskIdsToLoad = [...new Set([...uniqueIds, ...imageRefs.map((ref) => ref.taskId)])].slice(0, 400);
      const { tasks } = loadGenerationTaskHistoryDocumentsByIds(taskIdsToLoad, { assetMode: 'full' });
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
            const matchedRef = includeAllTaskImages ? null : refs.find((ref) => matchesArchiveImageRef(ref, task, image));
            if (!includeAllTaskImages && !matchedRef) return;
            const parsed = parseImageDataUrlForDownload(typeof image.src === 'string' ? image.src : '');
            if (!parsed) return;
            const base = archiveBaseName(task, taskIndex);
            const filename = uniqueArchiveFilename(
              usedNames,
              sanitizeDownloadFilename(matchedRef?.filename || preferredImageFilename(image) || `${base}-${imageIndex + 1}.${parsed.extension}`, parsed.extension)
            );
            entries.push({ filename, buffer: parsed.buffer });
          });
        });

      if (entries.length === 0) {
        res.status(422).json({ error: { message: 'Selected generation tasks do not contain downloadable full-size images.' } });
        return;
      }

      const archive = createZipArchive(entries);
      const filename = sanitizeDownloadFilename(req.body?.filename || 'image-studio-selection.zip', 'zip');
      if (req.body?.delivery === 'url') {
        const prepared = createTemporaryBinaryDownload(archive, filename, 'application/zip', 'zip');
        if (!prepared) {
          res.status(422).json({ error: { message: 'Could not prepare archive.' } });
          return;
        }
        const route = '/api/storage/generation-task-downloads/file/' + encodeURIComponent(prepared.id);
        res.json({ id: prepared.id, url: absolutePublicUrl(req, route), filename: prepared.filename, expiresAt: prepared.expiresAt, mediaType: prepared.mediaType });
        return;
      }
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Length', String(archive.length));
      res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_')}"`);
      res.setHeader('Cache-Control', 'private, max-age=60, no-transform');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.end(archive);
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.get('/api/storage/generation-task-downloads/file/:id', (req, res) => {
    try {
      const file = getTemporaryBinaryDownload(String(req.params.id ?? ''));
      if (!file) {
        res.status(404).json({ error: { message: 'Temporary file not found or expired.' } });
        return;
      }
      sendBinaryDownloadResponse(res, file.buffer, file.filename, file.mediaType);
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.get('/api/storage/generation-task-downloads/:id', (req, res) => {
    try {
      const download = getTemporaryImageDownload(String(req.params.id ?? ''));
      if (!download) {
        res.status(404).json({ error: { message: 'Temporary image download not found or expired.' } });
        return;
      }
      sendImageDownloadResponse(res, download.parsed, download.filename);
    } catch (error) {
      sendServerError(res, error);
    }
  });
}
