import { useEffect, useMemo, useState } from 'react';
import type { AttachmentPreviewItem } from './attachmentPreviewTypes';

type ComposerAttachment = AttachmentPreviewItem & { file: File };

interface AttachmentPreviewLabels {
  target: string;
  reference: (index: number) => string;
  mask: string;
}

interface AttachmentPreviewInput {
  targetImage: File | null;
  referenceImages: File[];
  mask: File | null;
  labels: AttachmentPreviewLabels;
}

export function getReferenceAttachmentId(file: File, index: number): string {
  return `reference-${file.name}-${file.size}-${index}`;
}

function makeItem(id: string, role: ComposerAttachment['role'], label: string, file: File, previewUrl: string): ComposerAttachment {
  return {
    id,
    role,
    label,
    file,
    name: file.name,
    size: file.size,
    type: file.type,
    previewUrl,
    lastModified: file.lastModified
  };
}

export function useAttachmentPreviewItems({ targetImage, referenceImages, mask, labels }: AttachmentPreviewInput): ComposerAttachment[] {
  const [targetUrl, setTargetUrl] = useState<string | null>(null);
  const [maskUrl, setMaskUrl] = useState<string | null>(null);
  const [referenceUrls, setReferenceUrls] = useState<string[]>([]);

  useEffect(() => {
    if (!targetImage) {
      setTargetUrl(null);
      return;
    }
    const url = URL.createObjectURL(targetImage);
    setTargetUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [targetImage]);

  useEffect(() => {
    if (!mask) {
      setMaskUrl(null);
      return;
    }
    const url = URL.createObjectURL(mask);
    setMaskUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [mask]);

  useEffect(() => {
    const urls = referenceImages.map((file) => URL.createObjectURL(file));
    setReferenceUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [referenceImages]);

  return useMemo<ComposerAttachment[]>(() => {
    const items: ComposerAttachment[] = [];
    if (targetImage && targetUrl) items.push(makeItem('target', 'target', labels.target, targetImage, targetUrl));
    referenceImages.forEach((file, index) => {
      const url = referenceUrls[index];
      if (url) items.push(makeItem(getReferenceAttachmentId(file, index), 'reference', labels.reference(index + 1), file, url));
    });
    if (mask && maskUrl) items.push(makeItem('mask', 'mask', labels.mask, mask, maskUrl));
    return items;
  }, [targetImage, targetUrl, referenceImages, referenceUrls, mask, maskUrl, labels]);
}
