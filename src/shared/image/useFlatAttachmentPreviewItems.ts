import { useMemo } from 'react';
import type { AttachmentPreviewItem } from './attachmentPreviewTypes';
import { useFileObjectUrls } from './useFileObjectUrls';

type ComposerAttachment = AttachmentPreviewItem & { file: File };

export interface FlatAttachmentPreviewInput {
  images: Array<{ id: string; file: File; role?: ComposerAttachment['role']; label?: string }>;
  label: (index: number) => string;
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

export function useFlatAttachmentPreviewItems({ images, label }: FlatAttachmentPreviewInput): ComposerAttachment[] {
  const files = useMemo(() => images.map((item) => item.file), [images]);
  const urls = useFileObjectUrls(files);

  return useMemo<ComposerAttachment[]>(() => images.flatMap((item, index) => {
    const url = urls.get(item.file);
    if (!url) return [];
    return makeItem(item.id, item.role ?? 'image', item.label ?? label(index + 1), item.file, url);
  }), [images, urls, label]);
}
