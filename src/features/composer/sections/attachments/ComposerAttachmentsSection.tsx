import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import { AttachmentImageStrip } from '../../../../shared/ui';
import type { ComposerLayoutContext } from '../../composerTypes';
import { useI18n } from '../../../../i18n';
import styles from '../../ComposerLayout.module.css';

export function ComposerAttachmentsSection({ context }: ElementDefinitionProps<ComposerLayoutContext>) {
  const { t } = useI18n();

  if (context.attachments.length === 0) return null;

  return (
    <AttachmentImageStrip
      items={context.attachments}
      onRemove={context.actions.removeAttachment}
      className={styles.attachmentStrip}
      ariaLabel={t('composer.attachmentsAria')}
      size="regular"
    />
  );
}
