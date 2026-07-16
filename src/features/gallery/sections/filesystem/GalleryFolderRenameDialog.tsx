import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useI18n } from '../../../../i18n';
import { useMediaQuery } from '../../../../shared/hooks/useMediaQuery';
import { BottomSheet, Button, Dialog } from '../../../../shared/ui';
import styles from './GalleryFolderRenameDialog.module.css';

interface GalleryFolderRenameDialogProps {
  open: boolean;
  currentName: string;
  onClose: () => void;
  onRename: (name: string) => Promise<void>;
}

export function GalleryFolderRenameDialog({ open, currentName, onClose, onRename }: GalleryFolderRenameDialogProps) {
  const { t } = useI18n();
  const isMobile = useMediaQuery('(max-width: 860px)');
  const [name, setName] = useState(currentName);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(currentName);
    setPending(false);
    setError('');
  }, [open, currentName]);

  const close = () => {
    if (!pending) onClose();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextName = name.trim();
    if (!nextName || pending) return;
    setPending(true);
    setError('');
    try {
      await onRename(nextName);
      onClose();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setPending(false);
    }
  };

  const form: ReactNode = (
    <form className={styles.form} onSubmit={submit}>
      <label>
        <span>{t('gallery.folderName')}</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={pending}
          autoFocus
          onFocus={(event) => event.currentTarget.select()}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <div className={styles.actions}>
        <Button type="button" variant="ghost" size="compact" disabled={pending} onClick={close}>
          {t('gallery.folderCreateCancel')}
        </Button>
        <Button type="submit" variant="primary" size="compact" disabled={!name.trim() || name.trim() === currentName || pending}>
          {pending ? t('gallery.folderRenaming') : t('gallery.folderRenameAction')}
        </Button>
      </div>
    </form>
  );

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        onClose={close}
        title={t('gallery.folderRenameTitle')}
        description={t('gallery.folderRenameDescription', { name: currentName })}
        closeLabel={t('attachment.close')}
        closeOnBackdrop={!pending}
        size="compact"
        ariaLabel={t('gallery.folderRenameTitle')}
      >
        {form}
      </BottomSheet>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title={t('gallery.folderRenameTitle')}
      description={t('gallery.folderRenameDescription', { name: currentName })}
      closeLabel={t('attachment.close')}
      closeOnBackdrop={!pending}
      closeOnEscape={!pending}
      size="compact"
      testId="gallery-rename-folder-dialog"
    >
      {form}
    </Dialog>
  );
}
