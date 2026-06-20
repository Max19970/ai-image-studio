import { HttpError, type ProviderFetchContext, type ProviderSettings, type UploadedFile } from '../types';
import { resolveComfyUiUrl } from './endpoints';
import { fetchComfyUiJson } from './http';

export interface ComfyUiUploadedImage {
  name: string;
  subfolder: string;
  type: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function normalizeUploadResult(value: unknown, fallbackName: string): ComfyUiUploadedImage {
  const root = isRecord(value) ? value : {};
  const name = readString(root.name ?? root.filename, fallbackName).trim();
  if (!name) {
    throw new HttpError('ComfyUI accepted the upload but did not return an image name.', 502);
  }
  return {
    name,
    subfolder: readString(root.subfolder),
    type: readString(root.type, 'input') || 'input'
  };
}

export function selectComfyUiHiresFixTargetImage(files: UploadedFile[]): UploadedFile {
  const targetFiles = files.filter((file) => file.fieldname === 'image_target');
  const unsupportedFiles = files.filter((file) => file.fieldname !== 'image_target');

  if (targetFiles.length !== 1 || unsupportedFiles.length > 0 || files.length !== 1) {
    throw new HttpError('ComfyUI Hires Fix requires exactly one target image and does not accept refs or masks.', 400);
  }

  const target = targetFiles[0];
  if (!target.buffer?.length) {
    throw new HttpError('ComfyUI Hires Fix target image is empty.', 400);
  }
  if (target.mimetype && !target.mimetype.startsWith('image/')) {
    throw new HttpError('ComfyUI Hires Fix target file must be an image.', 400);
  }
  return target;
}

export async function uploadComfyUiInputImage(
  provider: ProviderSettings,
  file: UploadedFile,
  context: ProviderFetchContext = {}
): Promise<ComfyUiUploadedImage> {
  const filename = (file.originalname || file.filename || 'image-studio-input.png').trim();
  const form = new FormData();
  form.append('image', new Blob([new Uint8Array(file.buffer)], { type: file.mimetype || 'application/octet-stream' }), filename);
  form.append('overwrite', 'true');

  const data = await fetchComfyUiJson<unknown>(provider, resolveComfyUiUrl(provider, '/upload/image'), {
    method: 'POST',
    body: form,
    timeoutMs: provider.timeoutMs,
    signal: context.signal
  });
  return normalizeUploadResult(data, filename);
}
