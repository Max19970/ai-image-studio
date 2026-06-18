import type { MouseEvent } from 'react';
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

export const galleryCardToImageDownload: ContextAdapter<GalleryCardActionContext, ImageDownloadActionContext> = (context) => {
  const image = context.activeImage;
  return {
    href: image?.src ?? null,
    filename: image ? `gpt-image-result-${context.galleryIndex + 1}.${imageExtension(image.format)}` : 'gpt-image-result.png',
    storageAssetKey: image?.storageAssetKey,
    storageAssetLoaded: image?.storageAssetLoaded,
    onClick: (event) => event.stopPropagation()
  };
};

export const detailToImageDownload: ContextAdapter<DetailActionContext, ImageDownloadActionContext> = (context) => {
  const image = context.activeImage;
  return {
    href: image?.src ?? null,
    filename: image ? `gpt-image-result-${image.index}.${imageExtension(image.format)}` : 'gpt-image-result.png',
    storageAssetKey: image?.storageAssetKey,
    storageAssetLoaded: image?.storageAssetLoaded
  };
};
