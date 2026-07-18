import type { GalleryLayoutContext } from '../../../../interface/context/workspace/gallery';
import { useI18n } from '../../../../i18n';
import { Button, DownloadIcon, XIcon } from '../../../../shared/ui';
import { GalleryQuickActionMenu } from '../shared/GalleryQuickActionMenu';
import styles from './GalleryExplorerBar.module.css';

export function GallerySelectionToolbar({ context, onDelete }: { context: GalleryLayoutContext; onDelete: () => void }) {
  const { t } = useI18n();
  const selectedCount = context.selection.selectedItems.length;
  const selectedTaskCount = context.selection.selectedTaskIds.length;

  const download = () => {
    void context.selection.downloadSelected().catch((error) => {
      window.alert(error instanceof Error ? error.message : String(error));
    });
  };

  return (
    <div className={styles.selectionToolbar} data-testid="gallery-selection-toolbar">
      <div className={styles.selectionSummary} aria-live="polite">
        <strong>{t('gallery.selectionCount', { count: selectedCount })}</strong>
      </div>
      <div className={styles.selectionControls}>
        <div className={styles.selectionActions}>
          <button type="button" className={`${styles.secondaryAction} ${styles.selectVisibleAction}`} onClick={context.selection.selectVisible}>{t('gallery.selectionSelectVisible')}</button>
          <button type="button" className={`${styles.secondaryAction} ${styles.downloadAction}`} disabled={selectedTaskCount === 0} onClick={download} aria-label={t('gallery.selectionDownloadCompact')}>
            <DownloadIcon size={18} />
            <span>{t('gallery.selectionDownloadCompact')}</span>
          </button>
          <button type="button" className={styles.primaryAction} data-testid="gallery-selection-move" disabled={selectedCount === 0} onClick={() => context.selection.copyToClipboard('move')}>{t('gallery.selectionMove')}</button>
          <button type="button" className={styles.dangerAction} disabled={selectedCount === 0} onClick={onDelete}>{t('gallery.selectionDelete')}</button>
          <GalleryQuickActionMenu triggerClassName={styles.moreTrigger} triggerLabel={t('gallery.selectionMore')} menuLabel={t('gallery.selectionMore')} testId="gallery-selection-more">
            {({ close }) => (
              <>
                <Button variant="ghost" size="compact" fullWidth role="menuitem" onClick={() => { context.selection.clearSelection(); close(); }}>
                  {t('gallery.selectionClear')}
                </Button>
                <Button variant="ghost" size="compact" fullWidth role="menuitem" disabled={selectedCount === 0} onClick={() => { context.selection.copyToClipboard('link-copy'); close(); }}>
                  {t('gallery.selectionLinkCopy')}
                </Button>
                <Button variant="ghost" size="compact" fullWidth role="menuitem" disabled={selectedCount === 0} onClick={() => { context.selection.copyToClipboard('deep-copy'); close(); }}>
                  {t('gallery.selectionDeepCopy')}
                </Button>
              </>
            )}
          </GalleryQuickActionMenu>
        </div>
        <span className={styles.selectionModeDivider} aria-hidden="true" />
        <button
          type="button"
          className={styles.closeSelection}
          data-testid="gallery-selection-cancel"
          onClick={context.selection.cancel}
          aria-label={t('gallery.selectionCancel')}
        >
          <XIcon size={18} />
        </button>
      </div>
    </div>
  );
}
