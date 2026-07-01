import { HttpError } from '../../http/httpError';
import type { UploadedFile } from '../types';

export function imageFilesForEdit(files: UploadedFile[]) {
  return files.filter((file) => ['image_target', 'image_reference', 'image'].includes(file.fieldname));
}

export function validateEditFiles(files: UploadedFile[]) {
  const images = imageFilesForEdit(files);
  if (images.length === 0) {
    throw new HttpError('Edit request requires at least one image attachment.', 400);
  }
}

export function formValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  return JSON.stringify(value);
}

export function appendOpenAiCompatibleEditPayload(form: FormData, payload: Record<string, unknown>, files: UploadedFile[]) {
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    form.append(key, formValue(value));
  });

  const target = files.find((file) => file.fieldname === 'image_target') ?? files.find((file) => file.fieldname === 'image');
  const refs = files.filter((file) => file.fieldname === 'image_reference');
  const legacyImages = files.filter((file) => file.fieldname === 'image').filter((file) => file !== target);

  if (target) {
    form.append('image', new Blob([new Uint8Array(target.buffer)], { type: target.mimetype || 'application/octet-stream' }), target.originalname);
  }

  [...refs, ...legacyImages].forEach((file) => {
    form.append('image', new Blob([new Uint8Array(file.buffer)], { type: file.mimetype || 'application/octet-stream' }), file.originalname);
  });

  const mask = files.find((file) => file.fieldname === 'mask');
  if (mask) {
    form.append('mask', new Blob([new Uint8Array(mask.buffer)], { type: mask.mimetype || 'image/png' }), mask.originalname);
  }
}

export function appendProbeImage(form: FormData, buffer: Buffer, filename: string, mimeType = 'image/png', fieldName = 'image') {
  form.append(fieldName, new Blob([new Uint8Array(buffer)], { type: mimeType }), filename);
}
