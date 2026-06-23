import { loadGenerationTaskAsset } from '../../../../infrastructure/storage/remoteGenerationTaskHistoryStore';
import { requestTelegramMiniAppImageDownload, resolveServerImageDownload, shouldUseTelegramMiniAppDownload } from '../../../../integrations/telegram-mini-app';

export function assetDownloadHref(storageAssetKey: string, filename: string) {
  const params = new URLSearchParams({ key: storageAssetKey, filename });
  return `/api/storage/generation-task-asset/download?${params.toString()}`;
}

export function shouldRouteThroughServer(href: string, storageAssetKey?: string) {
  return Boolean(storageAssetKey) || /^data:image\//i.test(href) || /^blob:/i.test(href);
}

export function isTelegramMiniAppDownloadRoute() {
  return shouldUseTelegramMiniAppDownload();
}

export function triggerDownload(href: string, filename: string) {
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function requestDownloadFallback(input: {
  href: string;
  filename: string;
  sourceHref: string;
  storageAssetKey?: string;
  storageAssetLoaded?: boolean;
}) {
  try {
    const resolved = await resolveServerImageDownload({
      href: input.sourceHref,
      filename: input.filename,
      storageAssetKey: input.storageAssetKey
    });
    if (resolved?.url) return triggerDownload(resolved.url, resolved.filename);
  } catch (error) {
    console.warn('Server image download route was not available.', error);
  }

  if (input.storageAssetKey && input.storageAssetLoaded === false) {
    const fullImage = await loadGenerationTaskAsset(input.storageAssetKey);
    if (fullImage?.src) return triggerDownload(fullImage.src, input.filename);
  }

  triggerDownload(input.sourceHref, input.filename);
}

export async function requestTelegramDownloadFallback(input: {
  href: string;
  filename: string;
  sourceHref: string;
  storageAssetKey?: string;
}): Promise<boolean> {
  if (!shouldUseTelegramMiniAppDownload()) return false;
  try {
    const handled = await requestTelegramMiniAppImageDownload({
      href: input.sourceHref,
      filename: input.filename,
      storageAssetKey: input.storageAssetKey
    });
    if (handled) return true;
  } catch (error) {
    console.warn('Telegram Mini App file action was not completed.', error);
  }

  triggerDownload(input.href, input.filename);
  return true;
}
