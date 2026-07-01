import { useCallback, useMemo } from 'react';
import type { ProviderGenerationModeDefinition } from '../../domain/providerMode';
import { addImageFilesToProviderModeDraft } from '../../entities/provider/attachmentCompatibility';
import { getReferenceAttachmentId, useFlatAttachmentPreviewItems, type AttachmentPreviewItem } from '../../shared/image';

export interface ComposerAttachmentState {
  targetImage: File | null;
  referenceImages: File[];
  mask: File | null;
}

export interface ComposerAttachmentActions {
  setTargetImage: (file: File | null) => void;
  setReferenceImages: (files: File[]) => void;
  setImageAttachments: (targetImage: File | null, referenceImages: File[]) => void;
  setMask: (file: File | null) => void;
}

export interface UseComposerAttachmentsInput extends ComposerAttachmentState {
  providerMode: ProviderGenerationModeDefinition;
  actions: ComposerAttachmentActions;
  labels: {
    mask: string;
    imageAttachment: (index: number) => string;
  };
}

export function useComposerAttachments({
  providerMode,
  targetImage,
  referenceImages,
  mask,
  actions,
  labels
}: UseComposerAttachmentsInput) {
  const flatImages = useMemo(() => [
    ...(targetImage ? [{ id: 'target', file: targetImage, role: 'image' as const }] : []),
    ...referenceImages.map((file, index) => ({ id: getReferenceAttachmentId(file, index), file, role: 'image' as const })),
    ...(mask ? [{ id: 'mask', file: mask, role: 'mask' as const, label: labels.mask }] : [])
  ], [targetImage, referenceImages, mask, labels.mask]);

  const attachments = useFlatAttachmentPreviewItems({ images: flatImages, label: labels.imageAttachment });

  const removeAttachment = useCallback((item: AttachmentPreviewItem) => {
    if (item.id === 'target') {
      actions.setTargetImage(null);
      return;
    }
    if (item.id === 'mask') {
      actions.setMask(null);
      return;
    }
    actions.setReferenceImages(referenceImages.filter((file, index) => item.id !== getReferenceAttachmentId(file, index)));
  }, [actions, referenceImages]);

  const clearAttachments = useCallback(() => {
    actions.setTargetImage(null);
    actions.setReferenceImages([]);
    actions.setMask(null);
  }, [actions]);

  const addAttachments = useCallback((files: File[]) => {
    const next = addImageFilesToProviderModeDraft({
      providerModeId: providerMode.id,
      targetImage,
      referenceImages,
      mask
    }, providerMode, files);
    actions.setImageAttachments(next.targetImage, next.referenceImages);
  }, [actions, mask, providerMode, referenceImages, targetImage]);

  return {
    attachments,
    hasImageAttachments: attachments.length > 0,
    removeAttachment,
    clearAttachments,
    addAttachments
  };
}
