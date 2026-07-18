import { useState } from 'react';
import { useI18n } from '../../../../i18n';
import { Button, ConfirmationDialog, Trash2Icon } from '../../../../shared/ui';
import type { GalleryHeaderActionContext } from '../../../../interface/context/workspace/gallery';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import styles from '../../sections/header/GalleryHeaderSection.module.css';

export function ClearResultsAction({ context }: ElementDefinitionProps<GalleryHeaderActionContext>) {
  const { t } = useI18n();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const count = context.tasks.length;

  return (
    <>
    <Button
      variant="ghost"
      tone="danger"
      size="compact"
      className={styles.clearResultsButton}
      onClick={() => setConfirmOpen(true)}
      aria-label={t('gallery.clearResultsAccessible')}
      title={t('gallery.clearResultsAccessible')}
    >
      <Trash2Icon className={styles.clearResultsIcon} size={17} />
      <span className={styles.clearResultsLabel}>{t('gallery.clearResults')}</span>
    </Button>
    <ConfirmationDialog
      open={confirmOpen}
      title={t('gallery.clearResultsTitle')}
      description={t('gallery.clearResultsConfirm', { count })}
      confirmLabel={t('gallery.confirmDeleteAction')}
      cancelLabel={t('gallery.confirmDeleteCancel')}
      closeLabel={t('attachment.close')}
      tone="danger"
      testId="gallery-clear-results-dialog"
      onClose={() => setConfirmOpen(false)}
      onConfirm={() => {
        setConfirmOpen(false);
        context.commands.clearResults();
      }}
    >
      <p>{t('gallery.deletePermanentHint')}</p>
    </ConfirmationDialog>
    </>
  );
}
