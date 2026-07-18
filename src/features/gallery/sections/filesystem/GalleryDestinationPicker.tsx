import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { getGalleryBreadcrumbs, isGalleryPathInside, joinGalleryPath, normalizeGalleryPath } from '../../../../domain/galleryFilesystem';
import type { GalleryLayoutContext } from '../../../../interface/context/workspace/gallery';
import { useI18n } from '../../../../i18n';
import { useMediaQuery } from '../../../../shared/hooks/useMediaQuery';
import { BottomSheet, Button, Dialog, FolderPlusIcon } from '../../../../shared/ui';
import { GalleryFolderTree } from './GalleryFolderTree';
import styles from './GalleryDestinationPicker.module.css';

function operationLabel(operation: 'move' | 'link-copy' | 'deep-copy', t: ReturnType<typeof useI18n>['t']): string {
  if (operation === 'move') return t('gallery.destinationMoveTitle');
  if (operation === 'link-copy') return t('gallery.destinationLinkCopyTitle');
  return t('gallery.destinationDeepCopyTitle');
}

function DestinationPickerBody({
  context,
  targetPath,
  pending,
  error,
  onTargetPathChange,
  onConfirm
}: {
  context: GalleryLayoutContext;
  targetPath: string;
  pending: boolean;
  error: string;
  onTargetPathChange: (path: string) => void;
  onConfirm: () => void;
}) {
  const { t } = useI18n();
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const breadcrumbs = getGalleryBreadcrumbs(targetPath);
  const clipboard = context.selection.clipboard;
  const invalidMoveTarget = clipboard?.operation === 'move' && clipboard.items.some((item) => (
    item.itemKind === 'folder' && (normalizeGalleryPath(item.itemId) === targetPath || isGalleryPathInside(targetPath, item.itemId))
  ));

  const createFolder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = folderName.trim();
    if (!name || creating) return;
    setCreating(true);
    setCreateError('');
    try {
      await context.commands.createFolderAt(targetPath, name);
      const nextPath = joinGalleryPath(targetPath, name);
      setFolderName('');
      setCreatorOpen(false);
      onTargetPathChange(nextPath);
    } catch (nextError) {
      setCreateError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={styles.body} data-testid="gallery-destination-picker-body">
      <nav className={styles.breadcrumbs} aria-label={t('gallery.destinationBreadcrumbs')}>
        {breadcrumbs.map((crumb, index) => (
          <span key={crumb.path} className={styles.crumbWrap}>
            {index > 0 && <span aria-hidden="true">/</span>}
            <button type="button" onClick={() => onTargetPathChange(crumb.path)}>
              {index === 0 ? t('gallery.rootFolder') : crumb.label}
            </button>
          </span>
        ))}
      </nav>

      <div className={styles.browser}>
        <GalleryFolderTree
          context={context}
          activePath={targetPath}
          onSelectPath={onTargetPathChange}
          showPinned={false}
          showToolbar={false}
          compact
        />
      </div>

      {creatorOpen ? (
        <form className={styles.creator} onSubmit={createFolder}>
          <label>
            <span>{t('gallery.folderName')}</span>
            <input
              value={folderName}
              onChange={(event) => setFolderName(event.target.value)}
              placeholder={t('gallery.folderNamePlaceholder')}
              disabled={creating}
              autoFocus
            />
          </label>
          {createError && <p role="alert">{createError}</p>}
          <div>
            <Button type="button" variant="ghost" size="compact" disabled={creating} onClick={() => { setCreatorOpen(false); setFolderName(''); setCreateError(''); }}>
              {t('gallery.folderCreateCancel')}
            </Button>
            <Button type="submit" variant="primary" size="compact" disabled={!folderName.trim() || creating}>
              {creating ? t('gallery.folderCreating') : t('gallery.folderCreate')}
            </Button>
          </div>
        </form>
      ) : (
        <button type="button" className={styles.createFolder} onClick={() => setCreatorOpen(true)}>
          <FolderPlusIcon size={18} />{t('gallery.destinationCreateFolder')}
        </button>
      )}

      {invalidMoveTarget && <p className={styles.error} role="alert">{t('gallery.destinationInvalidMove')}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}

      <button
        type="button"
        className={styles.confirm}
        disabled={pending || invalidMoveTarget}
        onClick={onConfirm}
      >
        {pending ? t('gallery.destinationWorking') : t('gallery.destinationConfirmHere')}
      </button>
    </div>
  );
}

export function GalleryDestinationPicker({ context }: { context: GalleryLayoutContext }) {
  const { t } = useI18n();
  const isMobile = useMediaQuery('(max-width: 860px)');
  const clipboard = context.selection.clipboard;
  const [targetPath, setTargetPath] = useState(context.activePath);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!clipboard) return;
    setTargetPath(context.activePath);
    setPending(false);
    setError('');
  }, [clipboard, context.activePath]);

  const title = useMemo(() => clipboard ? operationLabel(clipboard.operation, t) : '', [clipboard, t]);
  const description = clipboard ? t('gallery.destinationDescription', { count: clipboard.items.length }) : '';

  const close = () => {
    if (pending) return;
    context.selection.clearClipboard();
  };

  const confirm = async () => {
    if (!clipboard || pending) return;
    setPending(true);
    setError('');
    try {
      await context.commands.pasteItems(clipboard.operation, clipboard.items, targetPath);
      context.selection.clearClipboard();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setPending(false);
    }
  };

  const body: ReactNode = clipboard ? (
    <DestinationPickerBody
      context={context}
      targetPath={targetPath}
      pending={pending}
      error={error}
      onTargetPathChange={setTargetPath}
      onConfirm={() => void confirm()}
    />
  ) : null;

  if (isMobile) {
    return (
      <BottomSheet
        open={Boolean(clipboard)}
        onClose={close}
        title={title}
        description={description}
        closeLabel={t('attachment.close')}
        closeOnBackdrop={!pending}
        size="full"
        ariaLabel={title}
        className={styles.mobileSheet}
      >
        {body}
      </BottomSheet>
    );
  }

  return (
    <Dialog
      open={Boolean(clipboard)}
      onClose={close}
      title={title}
      description={description}
      closeLabel={t('attachment.close')}
      closeOnBackdrop={!pending}
      closeOnEscape={!pending}
      size="wide"
      className={styles.dialog}
      testId="gallery-destination-picker"
    >
      {body}
    </Dialog>
  );
}
