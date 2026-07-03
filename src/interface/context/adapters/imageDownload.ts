import type { MouseEvent } from 'react';
import type { GeneratedImage } from '../../../domain/generationTask';
import { imageExtension } from '../../../domain/imageFiles';
import type { DetailActionContext, GalleryCardActionContext } from '../workspace';
import type { ContextAdapter } from './types';

export interface ImageDownloadActionContext {
  href: string | null;
  filename: string;
  storageAssetKey?: string;
  storageAssetLoaded?: boolean;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
}

function imageDownloadFilename(image: GeneratedImage | null | undefined, fallbackIndex: number): string {
  if (!image) return 'gpt-image-result.png';
  const raw = image.raw as any;
  const filename = image.filename ?? raw?.filename ?? raw?.comfyui?.filename;
  return typeof filename === 'string' && filename.trim() ? filename.trim() : `gpt-image-result-${fallbackIndex}.${imageExtension(image.format)}`;
}

export const galleryCardToImageDownload: ContextAdapter<GalleryCardActionContext, ImageDownloadActionContext> = (context) => {
  const image = context.activeImage;
  return {
    href: image?.src ?? null,
    filename: imageDownloadFilename(image, context.galleryIndex + 1),
    storageAssetKey: image?.storageAssetKey,
    storageAssetLoaded: image?.storageAssetLoaded,
    onClick: (event) => event.stopPropagation()
  };
};

export const detailToImageDownload: ContextAdapter<DetailActionContext, ImageDownloadActionContext> = (context) => {
  const image = context.activeImage;
  return {
    href: image?.src ?? null,
    filename: imageDownloadFilename(image, image?.index ?? 1),
    storageAssetKey: image?.storageAssetKey,
    storageAssetLoaded: image?.storageAssetLoaded
  };
};
