import { useMemo, useRef } from 'react';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import { SlotHost } from '../../../../interface/SlotHost';
import type { AttachmentPreviewItem } from '../../../../shared/ui';
import type { BatchDraftLayoutContext } from '../../batchComposerTypes';
import { useI18n } from '../../../../i18n';
import { getReferenceAttachmentId, useAttachmentPreviewItems } from '../../../../shared/image/useAttachmentPreviewItems';
import styles from './BatchDraftCardSection.module.css';

export function BatchDraftCardSection({ context }: ElementDefinitionProps<BatchDraftLayoutContext>) {
  const { t } = useI18n();
  const targetRef = useRef<HTMLInputElement | null>(null);
  const refsRef = useRef<HTMLInputElement | null>(null);
  const maskRef = useRef<HTMLInputElement | null>(null);

  const attachmentLabels = useMemo(() => ({
    target: t('composer.role.target'),
    reference: (index: number) => t('composer.role.ref', { index }),
    mask: t('composer.role.mask')
  }), [t]);

  const attachments = useAttachmentPreviewItems({
    targetImage: context.draft.targetImage,
    referenceImages: context.draft.referenceImages,
    mask: context.draft.mask,
    labels: attachmentLabels
  });

  const removeAttachment = (item: AttachmentPreviewItem) => {
    if (item.role === 'target') context.actions.patchDraft({ targetImage: null, mode: context.draft.referenceImages.length || context.draft.mask ? 'edit' : context.draft.mode });
    if (item.role === 'mask') context.actions.patchDraft({ mask: null });
    if (item.role === 'reference') {
      context.actions.patchDraft({ referenceImages: context.draft.referenceImages.filter((file, index) => item.id !== getReferenceAttachmentId(file, index)) });
    }
  };

  const cardContext: BatchDraftLayoutContext = {
    ...context,
    attachments,
    attachmentsCount: (context.draft.targetImage ? 1 : 0) + context.draft.referenceImages.length + (context.draft.mask ? 1 : 0),
    fileInputs: {
      target: targetRef,
      references: refsRef,
      mask: maskRef
    },
    actions: {
      ...context.actions,
      removeAttachment
    }
  };

  return (
    <article className={styles.draftCard}>
      <SlotHost<BatchDraftLayoutContext> slot="batch-composer/draft/header" context={cardContext} as={null} />
      <SlotHost<BatchDraftLayoutContext> slot="batch-composer/draft/mode" context={cardContext} as={null} />
      <SlotHost<BatchDraftLayoutContext> slot="batch-composer/draft/prompt" context={cardContext} as={null} />
      <SlotHost<BatchDraftLayoutContext> slot="batch-composer/draft/attachments" context={cardContext} as={null} />
      <SlotHost<BatchDraftLayoutContext> slot="batch-composer/draft/toolbar" context={cardContext} as={null} />
    </article>
  );
}
