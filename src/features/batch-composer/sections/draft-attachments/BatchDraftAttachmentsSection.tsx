import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import { AttachmentImageStrip } from '../../../../shared/ui';
import type { BatchDraftLayoutContext } from '../../batchComposerTypes';
import { useI18n } from '../../../../i18n';
import styles from './BatchDraftAttachmentsSection.module.css';

export function BatchDraftAttachmentsSection({ context }: ElementDefinitionProps<BatchDraftLayoutContext>) {
  const { t } = useI18n();

  if (context.attachments.length === 0) return null;

  return (
    <AttachmentImageStrip
      items={context.attachments}
      onRemove={context.actions.removeAttachment}
      className={styles.draftAttachments}
      ariaLabel={t('composer.attachmentsAria')}
      size="compact"
    />
  );
}
