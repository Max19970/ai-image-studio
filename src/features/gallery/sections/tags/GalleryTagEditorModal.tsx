import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../../../../shared/ui';
import { normalizeGalleryTag } from '../../../../entities/gallery/galleryMetadata';
import { useI18n } from '../../../../i18n';
import { useModalDialog } from '../../../../shared/hooks/useModalDialog';
import styles from './GalleryTagEditorModal.module.css';

interface GalleryTagEditorModalProps {
  open: boolean;
  title: string;
  tags: string[];
  onClose: () => void;
  onSave: (tags: string[]) => void;
}

function uniqueTags(tags: string[]): string[] {
  return [...new Set(tags.map(normalizeGalleryTag).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function GalleryTagEditorModal({ open, title, tags, onClose, onSave }: GalleryTagEditorModalProps) {
  const { t } = useI18n();
  const [draftTags, setDraftTags] = useState<string[]>(() => uniqueTags(tags));
  const [input, setInput] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  useModalDialog({ open, rootRef, dialogRef, onClose });

  useEffect(() => {
    if (!open) return;
    setDraftTags(uniqueTags(tags));
    setInput('');
  }, [open, tags]);

  const normalizedInput = useMemo(() => normalizeGalleryTag(input), [input]);

  const addTag = (value = input) => {
    const tag = normalizeGalleryTag(value);
    if (!tag) return;
    setDraftTags((current) => uniqueTags([...current, tag]));
    setInput('');
  };

  const removeTag = (tag: string) => {
    setDraftTags((current) => current.filter((item) => item !== tag));
  };

  const save = () => {
    onSave(uniqueTags(normalizedInput ? [...draftTags, normalizedInput] : draftTags));
    onClose();
  };

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div ref={rootRef} className={styles.root} role="presentation">
      <button type="button" className={styles.backdrop} aria-hidden="true" tabIndex={-1} onClick={onClose} />
      <section ref={dialogRef} className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="gallery-tag-editor-title" tabIndex={-1} onMouseDown={(event) => event.stopPropagation()}>
        <span className={styles.handle} aria-hidden="true" />
        <header className={styles.header}>
          <h2 id="gallery-tag-editor-title">{title}</h2>
          <p>{t('gallery.tagsModalDescription')}</p>
        </header>
        <div className={styles.body}>
          <div className={styles.editor}>
            <label className={styles.inputWrap}>
              <span>{t('gallery.tagsModalInput')}</span>
              <div className={styles.inputRow}>
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ',') return;
                    event.preventDefault();
                    addTag();
                  }}
                  placeholder={t('gallery.tagsModalPlaceholder')}
                  autoFocus
                />
                <Button variant="ghost" size="compact" onClick={() => addTag()} disabled={!normalizedInput}>{t('gallery.tagsModalAdd')}</Button>
              </div>
            </label>
            <div className={styles.tagList} aria-label={t('gallery.actionTags')}>
              {draftTags.length === 0 && <span className={styles.empty}>{t('gallery.tagsModalEmpty')}</span>}
              {draftTags.map((tag) => (
                <button key={tag} type="button" className={styles.tagChip} onClick={() => removeTag(tag)}>
                  #{tag}<span aria-hidden="true">×</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <footer className={styles.footer}>
          <Button variant="ghost" size="compact" onClick={onClose}>{t('gallery.selectionCancel')}</Button>
          <Button variant="primary" size="compact" onClick={save}>{t('gallery.tagsModalSave')}</Button>
        </footer>
      </section>
    </div>,
    document.body
  );
}
