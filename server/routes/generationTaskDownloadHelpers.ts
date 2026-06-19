import { randomUUID } from 'node:crypto';
import type express from 'express';

export interface ParsedImageDownload {
  buffer: Buffer;
  mediaType: string;
  extension: string;
}

export interface TemporaryImageDownload {
  id: string;
  parsed: ParsedImageDownload;
  filename: string;
  expiresAt: number;
}

const temporaryDownloads = new Map<string, TemporaryImageDownload>();
const temporaryDownloadTtlMs = 10 * 60 * 1000;
const temporaryDownloadLimit = 32;

export function parseImageDataUrlForDownload(src: string): ParsedImageDownload | null {
  const match = /^data:(image\/[-+.\w]+)(?:;[-+.\w]+=[-+.\w]+)*;base64,([A-Za-z0-9+/=\s]+)$/i.exec(src.trim());
  if (!match) return null;

  const mediaType = match[1].toLowerCase();
  const extension = mediaTypeToExtension(mediaType);
  const normalizedBase64 = match[2].replace(/\s/g, '');
  if (!extension || !normalizedBase64) return null;

  try {
    const buffer = Buffer.from(normalizedBase64, 'base64');
    if (!buffer.length) return null;
    return { buffer, mediaType, extension };
  } catch {
    return null;
  }
}

export function sanitizeDownloadFilename(value: unknown, extension = 'png'): string {
  const fallback = `gpt-image-result.${extension}`;
  const raw = typeof value === 'string' ? value : fallback;
  const withoutPath = raw.split(/[\\/]/).pop() ?? fallback;
  const normalized = withoutPath
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[<>:"|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140);
  const safe = normalized || fallback;
  return /\.[a-z0-9]{2,5}$/i.test(safe) ? safe : `${safe}.${extension}`;
}

export function absolutePublicUrl(req: express.Request, pathOrUrl: string): string {
  try {
    return new URL(pathOrUrl).toString();
  } catch {
    const configuredBase = process.env.IMAGE_STUDIO_PUBLIC_URL?.trim();
    const forwardedProto = firstForwardedValue(req.get('x-forwarded-proto'));
    const forwardedHost = firstForwardedValue(req.get('x-forwarded-host'));
    const host = forwardedHost || req.get('host') || '127.0.0.1';
    const protocol = configuredBase ? undefined : forwardedProto || req.protocol || 'http';
    const base = configuredBase || `${protocol}://${host}`;
    return new URL(pathOrUrl, base.endsWith('/') ? base : `${base}/`).toString();
  }
}

export function sendImageDownloadResponse(res: express.Response, parsed: ParsedImageDownload, filename: string): void {
  const safeFilename = sanitizeDownloadFilename(filename, parsed.extension);
  res.setHeader('Content-Type', parsed.mediaType);
  res.setHeader('Content-Length', String(parsed.buffer.length));
  res.setHeader('Content-Disposition', contentDispositionAttachment(safeFilename));
  res.setHeader('Access-Control-Allow-Origin', 'https://web.telegram.org');
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(parsed.buffer);
}

export function createTemporaryImageDownload(src: string, filename: unknown, now = Date.now()): TemporaryImageDownload | null {
  const parsed = parseImageDataUrlForDownload(src);
  if (!parsed) return null;

  pruneExpiredTemporaryDownloads(now);
  while (temporaryDownloads.size >= temporaryDownloadLimit) {
    const firstKey = temporaryDownloads.keys().next().value as string | undefined;
    if (!firstKey) break;
    temporaryDownloads.delete(firstKey);
  }

  const id = `${now.toString(36)}-${randomUUID()}`;
  const download: TemporaryImageDownload = {
    id,
    parsed,
    filename: sanitizeDownloadFilename(filename, parsed.extension),
    expiresAt: now + temporaryDownloadTtlMs
  };
  temporaryDownloads.set(id, download);
  return download;
}

export function getTemporaryImageDownload(id: string, now = Date.now()): TemporaryImageDownload | null {
  pruneExpiredTemporaryDownloads(now);
  const download = temporaryDownloads.get(id);
  if (!download || download.expiresAt <= now) {
    temporaryDownloads.delete(id);
    return null;
  }
  return download;
}

export function clearTemporaryImageDownloadsForTests(): void {
  temporaryDownloads.clear();
}

function pruneExpiredTemporaryDownloads(now: number): void {
  for (const [id, download] of temporaryDownloads) {
    if (download.expiresAt <= now) temporaryDownloads.delete(id);
  }
}

function firstForwardedValue(value: string | undefined): string | null {
  return value?.split(',')[0]?.trim() || null;
}

function mediaTypeToExtension(mediaType: string): string | null {
  switch (mediaType) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    default:
      return null;
  }
}

function contentDispositionAttachment(filename: string): string {
  const asciiFallback = filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeRFC5987Value(filename)}`;
}

function encodeRFC5987Value(value: string): string {
  return encodeURIComponent(value).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}
