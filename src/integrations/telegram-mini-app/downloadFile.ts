import { getTelegramWebApp, type TelegramWebAppBridge } from './telegramWebApp';

const temporaryDownloadsPath = '/api/storage/generation-task-downloads';
const directUrlVerificationTimeoutMs = 2500;

export interface TelegramMiniAppImageDownloadRequest {
  href: string;
  filename: string;
  storageAssetKey?: string;
}

interface DownloadRegistrationRequest {
  filename: string;
  src?: string;
  storageAssetKey?: string;
}

interface DownloadRegistrationResponse {
  url?: unknown;
  filename?: unknown;
  mediaType?: unknown;
}

interface ResolvedTelegramDownload {
  url: string;
  filename: string;
  trustedImage: boolean;
}

export function shouldUseTelegramMiniAppDownload(webApp: TelegramWebAppBridge | null = getTelegramWebApp()): boolean {
  return Boolean(webApp && (typeof webApp.downloadFile === 'function' || typeof webApp.openLink === 'function'));
}

export async function requestTelegramMiniAppImageDownload(request: TelegramMiniAppImageDownloadRequest): Promise<boolean> {
  const webApp = getTelegramWebApp();
  if (!shouldUseTelegramMiniAppDownload(webApp)) return false;

  const resolved = await resolveTelegramDownload(request);
  if (!resolved) return false;

  if (new URL(resolved.url).protocol !== 'https:') {
    webApp?.showAlert?.('Для скачивания из Telegram Mini App нужна публичная HTTPS-ссылка на файл.');
    return false;
  }

  if (!resolved.trustedImage) {
    const verified = await verifyTelegramDownloadUrl(resolved.url);
    if (!verified) {
      webApp?.showAlert?.('Не удалось подготовить файл для Telegram: ссылка вернула не изображение. Проверь, что Mini App открыт через Express-сервер, а не через статический/Vite preview.');
      return false;
    }
  }

  if (typeof webApp?.downloadFile === 'function' && (webApp.isVersionAtLeast?.('8.0') ?? true)) {
    webApp.downloadFile({ url: resolved.url, file_name: resolved.filename });
    return true;
  }

  if (typeof webApp?.openLink === 'function') {
    webApp.openLink(resolved.url);
    return true;
  }

  return false;
}

export async function resolveTelegramDownloadUrl(request: TelegramMiniAppImageDownloadRequest): Promise<string | null> {
  return (await resolveTelegramDownload(request))?.url ?? null;
}

async function resolveTelegramDownload(request: TelegramMiniAppImageDownloadRequest): Promise<ResolvedTelegramDownload | null> {
  if (request.storageAssetKey) {
    return registerDownload({ filename: request.filename, storageAssetKey: request.storageAssetKey });
  }

  if (/^data:image\//i.test(request.href)) return registerDownload({ filename: request.filename, src: request.href });
  if (/^blob:/i.test(request.href)) {
    const dataUrl = await readBlobUrlAsDataUrl(request.href);
    return dataUrl ? registerDownload({ filename: request.filename, src: dataUrl }) : null;
  }

  try {
    const url = new URL(request.href, window.location.href);
    return url.protocol === 'https:'
      ? { url: url.toString(), filename: request.filename, trustedImage: false }
      : null;
  } catch {
    return null;
  }
}

async function registerDownload(request: DownloadRegistrationRequest): Promise<ResolvedTelegramDownload | null> {
  const response = await fetch(temporaryDownloadsPath, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });
  if (!response.ok) throw new Error(await response.text());

  const data = await response.json() as DownloadRegistrationResponse;
  if (typeof data.url !== 'string') return null;

  const filename = typeof data.filename === 'string' && data.filename.trim() ? data.filename : request.filename;
  const mediaType = typeof data.mediaType === 'string' ? data.mediaType : '';
  return { url: data.url, filename, trustedImage: /^image\//i.test(mediaType) };
}

async function verifyTelegramDownloadUrl(url: string): Promise<boolean> {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeout = controller
    ? setTimeout(() => controller.abort(), directUrlVerificationTimeoutMs)
    : null;

  try {
    const response = await fetch(url, { method: 'HEAD', cache: 'no-store', signal: controller?.signal });
    const contentType = response.headers.get('content-type') ?? '';
    return response.ok && /^image\//i.test(contentType);
  } catch {
    return false;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function readBlobUrlAsDataUrl(href: string): Promise<string | null> {
  const response = await fetch(href);
  if (!response.ok) return null;
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => reject(reader.error ?? new Error('Could not read image blob.'));
    reader.readAsDataURL(blob);
  });
}
