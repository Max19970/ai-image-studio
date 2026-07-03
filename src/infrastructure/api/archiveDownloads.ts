import { getTelegramWebApp } from '../../integrations/telegram-mini-app/telegramWebApp';
import { describeApiError, fetchProxy } from './common';

export interface GenerationArchiveImageRef {
  taskId: string;
  imageId?: string;
  storageAssetKey?: string;
  filename?: string;
}

interface ArchiveDownloadResponse {
  url?: unknown;
  filename?: unknown;
  mediaType?: unknown;
}

async function throwArchiveError(response: Response): Promise<never> {
  const raw = await response.text();
  let data: unknown = raw;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    // keep raw response
  }
  throw new Error(describeApiError(data, raw || response.statusText || `HTTP ${response.status}`));
}

function canUseTelegramFileDownload(): boolean {
  const webApp = getTelegramWebApp();
  return Boolean(webApp && (typeof webApp.downloadFile === 'function' || typeof webApp.openLink === 'function'));
}

function triggerBrowserBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function triggerTelegramFileDownload(response: Response, fallbackFilename: string): Promise<boolean> {
  const webApp = getTelegramWebApp();
  if (!webApp) return false;
  const data = await response.json() as ArchiveDownloadResponse;
  if (typeof data.url !== 'string') return false;
  const filename = typeof data.filename === 'string' && data.filename.trim() ? data.filename : fallbackFilename;
  let url: URL;
  try {
    url = new URL(data.url);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') {
    webApp.showAlert?.('Для скачивания из Telegram Mini App нужна публичная HTTPS-ссылка на архив.');
    return true;
  }
  if (typeof webApp.downloadFile === 'function' && (webApp.isVersionAtLeast?.('8.0') ?? true)) {
    webApp.downloadFile({ url: url.toString(), file_name: filename });
    return true;
  }
  if (typeof webApp.openLink === 'function') {
    webApp.openLink(url.toString());
    return true;
  }
  return false;
}

async function downloadGenerationArchive(body: { taskIds?: string[]; imageRefs?: GenerationArchiveImageRef[]; filename: string }): Promise<void> {
  const telegramDelivery = canUseTelegramFileDownload();
  const response = await fetchProxy('/api/storage/generation-task-downloads/archive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(telegramDelivery ? { ...body, delivery: 'url' } : body)
  });
  if (!response.ok) await throwArchiveError(response);
  if (telegramDelivery && await triggerTelegramFileDownload(response, body.filename)) return;
  triggerBrowserBlobDownload(await response.blob(), body.filename);
}

export async function downloadGenerationTasksArchive(taskIds: string[], filename = 'image-studio-selection.zip'): Promise<void> {
  await downloadGenerationArchive({ taskIds, filename });
}

export async function downloadGenerationImagesArchive(imageRefs: GenerationArchiveImageRef[], filename = 'image-studio-images.zip'): Promise<void> {
  await downloadGenerationArchive({ imageRefs, filename });
}
