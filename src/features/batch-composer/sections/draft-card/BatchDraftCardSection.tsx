import { useCallback, useMemo, useRef } from 'react';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import { SlotHost } from '../../../../interface/SlotHost';
import type { AttachmentPreviewItem } from '../../../../shared/ui';
import type { BatchDraftLayoutContext } from '../../batchComposerTypes';
import { useI18n } from '../../../../i18n';
import { getReferenceAttachmentId, useFlatAttachmentPreviewItems } from '../../../../shared/image';
import styles from './BatchDraftCardSection.module.css';

export function BatchDraftCardSection({ context }: ElementDefinitionProps<BatchDraftLayoutContext>) {
  const { t } = useI18n();
  const attachmentsRef = useRef<HTMLInputElement | null>(null);
  const maskRef = useRef<HTMLInputElement | null>(null);

  const flatImages = useMemo(() => [
    ...(context.draft.targetImage ? [{ id: 'target', file: context.draft.targetImage, role: 'image' as const }] : []),
    ...context.draft.referenceImages.map((file, index) => ({ id: getReferenceAttachmentId(file, index), file, role: 'image' as const })),
    ...(context.draft.mask ? [{ id: 'mask', file: context.draft.mask, role: 'mask' as const, label: t('composer.mask') }] : [])
  ], [context.draft.mask, context.draft.referenceImages, context.draft.targetImage, t]);

  const getAttachmentLabel = useCallback((index: number) => t('composer.imageAttachmentLabel', { index }), [t]);

  const attachments = useFlatAttachmentPreviewItems({
    images: flatImages,
    label: getAttachmentLabel
  });

  const removeAttachment = useCallback((item: AttachmentPreviewItem) => {
    if (item.id === 'target') {
      context.actions.patchDraft({ targetImage: null });
      return;
    }
    if (item.id === 'mask') {
      context.actions.patchDraft({ mask: null });
      return;
    }
    context.actions.patchDraft({ referenceImages: context.draft.referenceImages.filter((file, index) => item.id !== getReferenceAttachmentId(file, index)) });
  }, [context.actions, context.draft.referenceImages]);

  const cardContext = useMemo<BatchDraftLayoutContext>(() => ({
    ...context,
    attachments,
    attachmentsCount: attachments.length,
    requestPresets: context.requestPresets,
    fileInputs: {
      attachments: attachmentsRef,
      mask: maskRef
    },
    actions: {
      ...context.actions,
      removeAttachment,
      savePreset: context.actions.savePreset,
      updatePreset: context.actions.updatePreset,
      deletePreset: context.actions.deletePreset,
      applyPreset: context.actions.applyPreset
    }
  }), [context, attachments, removeAttachment]);

  return (
    <article className={styles.draftCard} data-testid="batch-selected-composer">
      <div className={styles.commandSurface}>
        <SlotHost<BatchDraftLayoutContext> slot="batch-composer/draft/attachments" context={cardContext} as={null} />
        <div className={styles.promptRail}>
          <SlotHost<BatchDraftLayoutContext> slot="batch-composer/draft/toolbar" context={cardContext} as={null} />
          <SlotHost<BatchDraftLayoutContext> slot="batch-composer/draft/prompt" context={cardContext} as={null} />
        </div>
      </div>
    </article>
  );
}
