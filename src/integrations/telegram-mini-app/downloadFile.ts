import { resolveServerImageFile, type ResolvedServerImageFile } from '../../infrastructure/host-environment';
import { getTelegramWebApp, type TelegramWebAppBridge } from './telegramWebApp';

const directUrlVerificationTimeoutMs = 2500;

export interface TelegramMiniAppImageDownloadRequest {
  href: string;
  filename: string;
  storageAssetKey?: string;
}

export type ResolvedServerImageDownload = ResolvedServerImageFile;
type ResolvedTelegramDownload = ResolvedServerImageFile;

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

export async function resolveServerImageDownload(request: TelegramMiniAppImageDownloadRequest): Promise<ResolvedServerImageDownload | null> {
  return resolveServerImageFile(request);
}

async function resolveTelegramDownload(request: TelegramMiniAppImageDownloadRequest): Promise<ResolvedTelegramDownload | null> {
  const serverDownload = await resolveServerImageFile(request);
  if (serverDownload) return serverDownload;

  try {
    const url = new URL(request.href, window.location.href);
    return url.protocol === 'https:'
      ? { url: url.toString(), filename: request.filename, mediaType: '', trustedImage: false }
      : null;
  } catch {
    return null;
  }
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
