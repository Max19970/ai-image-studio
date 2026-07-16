import { useEffect, useRef, type FormEvent } from 'react';
import { useI18n } from '../../../../i18n';
import { Button } from '../../../../shared/ui';
import styles from './GalleryExplorerBar.module.css';

interface GalleryFolderCreatorFormProps {
  compact?: boolean;
  autoFocus?: boolean;
  name: string;
  pending: boolean;
  error: string;
  onNameChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}

export function GalleryFolderCreatorForm({ compact = false, autoFocus = true, name, pending, error, onNameChange, onSubmit, onCancel }: GalleryFolderCreatorFormProps) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!autoFocus || pending) return;
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [autoFocus, pending]);

  return (
    <form className={`${styles.creatorForm} ${compact ? styles.creatorFormCompact : ''}`} data-testid="gallery-folder-creator" onSubmit={onSubmit}>
      <label className={styles.creatorField}>
        <span>{t('gallery.folderName')}</span>
        <input
          ref={inputRef}
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder={t('gallery.folderNamePlaceholder')}
          disabled={pending}
        />
      </label>
      {error && <p className={styles.formError} role="alert">{error}</p>}
      <div className={styles.creatorActions}>
        <Button type="button" variant="ghost" size="compact" disabled={pending} onClick={onCancel}>
          {t('gallery.folderCreateCancel')}
        </Button>
        <Button type="submit" variant="primary" size="compact" disabled={!name.trim() || pending}>
          {pending ? t('gallery.folderCreating') : t('gallery.folderCreate')}
        </Button>
      </div>
    </form>
  );
}
