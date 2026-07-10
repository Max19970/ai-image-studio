import { getActiveHostImageFileTransport, resolveServerImageFile } from '../../infrastructure/host-environment';
import { loadGenerationTaskAsset } from '../../infrastructure/storage/remoteGenerationTaskHistoryStore';

export function assetDownloadHref(storageAssetKey: string, filename: string) {
  const params = new URLSearchParams({ key: storageAssetKey, filename });
  return `/api/storage/generation-task-asset/download?${params.toString()}`;
}

export function shouldRouteThroughServer(href: string, storageAssetKey?: string) {
  return Boolean(storageAssetKey) || /^data:image\//i.test(href) || /^blob:/i.test(href);
}

export function hasHostImageFileTransport() {
  return Boolean(getActiveHostImageFileTransport());
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
    const resolved = await resolveServerImageFile({
      href: input.sourceHref,
      filename: input.filename,
      storageAssetKey: input.storageAssetKey
    });
    if (resolved?.url) return triggerDownload(resolved.url, resolved.filename);
  } catch (error) {
    console.warn('Server image file route was not available.', error);
  }

  if (input.storageAssetKey && input.storageAssetLoaded === false) {
    const fullImage = await loadGenerationTaskAsset(input.storageAssetKey);
    if (fullImage?.src) return triggerDownload(fullImage.src, input.filename);
  }

  triggerDownload(input.sourceHref, input.filename);
}

export async function requestHostImageFileFallback(input: {
  href: string;
  filename: string;
  sourceHref: string;
  storageAssetKey?: string;
}): Promise<boolean> {
  const transport = getActiveHostImageFileTransport();
  if (!transport) return false;
  try {
    const handled = await transport.saveImage({
      href: input.sourceHref,
      filename: input.filename,
      storageAssetKey: input.storageAssetKey
    });
    if (handled) return true;
  } catch (error) {
    console.warn('Host image file action was not completed.', error);
  }

  triggerDownload(input.sourceHref, input.filename);
  return true;
}
