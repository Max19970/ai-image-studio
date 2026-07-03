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

export interface TemporaryBinaryDownload {
  id: string;
  buffer: Buffer;
  filename: string;
  mediaType: string;
  expiresAt: number;
}

export interface ZipDownloadEntry {
  filename: string;
  buffer: Buffer;
}

const temporaryDownloads = new Map<string, TemporaryImageDownload>();
const temporaryFileDownloads = new Map<string, TemporaryBinaryDownload>();
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
  sendBinaryDownloadResponse(res, parsed.buffer, sanitizeDownloadFilename(filename, parsed.extension), parsed.mediaType);
}

export function sendBinaryDownloadResponse(res: express.Response, buffer: Buffer, filename: string, mediaType: string): void {
  res.setHeader('Content-Type', mediaType);
  res.setHeader('Content-Length', String(buffer.length));
  res.setHeader('Content-Disposition', contentDispositionAttachment(filename));
  res.setHeader('Access-Control-Allow-Origin', 'https://web.telegram.org');
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(buffer);
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

export function createTemporaryBinaryDownload(buffer: Buffer, filename: unknown, mediaType: string, extension: string, now = Date.now()): TemporaryBinaryDownload | null {
  if (!buffer.length) return null;
  pruneExpiredTemporaryFileDownloads(now);
  const id = `${now.toString(36)}-${randomUUID()}`;
  const download: TemporaryBinaryDownload = { id, buffer, filename: sanitizeDownloadFilename(filename, extension), mediaType, expiresAt: now + temporaryDownloadTtlMs };
  temporaryFileDownloads.set(id, download);
  return download;
}

export function getTemporaryBinaryDownload(id: string, now = Date.now()): TemporaryBinaryDownload | null {
  pruneExpiredTemporaryFileDownloads(now);
  const download = temporaryFileDownloads.get(id);
  if (!download || download.expiresAt <= now) {
    temporaryFileDownloads.delete(id);
    return null;
  }
  return download;
}

export function clearTemporaryImageDownloadsForTests(): void {
  temporaryDownloads.clear();
  temporaryFileDownloads.clear();
}

function pruneExpiredTemporaryDownloads(now: number): void {
  for (const [id, download] of temporaryDownloads) {
    if (download.expiresAt <= now) temporaryDownloads.delete(id);
  }
}

function pruneExpiredTemporaryFileDownloads(now: number): void {
  for (const [id, download] of temporaryFileDownloads) {
    if (download.expiresAt <= now) temporaryFileDownloads.delete(id);
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

export function createZipArchive(entries: ZipDownloadEntry[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  const now = new Date();
  const dosTime = ((now.getHours() & 0x1f) << 11) | ((now.getMinutes() & 0x3f) << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = (((now.getFullYear() - 1980) & 0x7f) << 9) | (((now.getMonth() + 1) & 0x0f) << 5) | (now.getDate() & 0x1f);

  for (const entry of entries) {
    const name = Buffer.from(entry.filename.replace(/\\/g, '/'), 'utf8');
    const data = entry.buffer;
    const checksum = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(dosTime, 12);
    central.writeUInt16LE(dosDate, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);
    offset += local.length + name.length + data.length;
  }

  const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, ...centralParts, end]);
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function contentDispositionAttachment(filename: string): string {
  const asciiFallback = filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeRFC5987Value(filename)}`;
}

function encodeRFC5987Value(value: string): string {
  return encodeURIComponent(value).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}
