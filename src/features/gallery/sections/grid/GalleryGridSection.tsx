import type { ReactNode } from 'react';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import { SlotHost } from '../../../../interface/SlotHost';
import type { GalleryFolderCardContext, GalleryLayoutContext, GalleryTaskCardContext } from '../../../../interface/context/workspace/gallery';
import type { GalleryItem } from '../../../../entities/gallery/galleryItems';
import { useI18n } from '../../../../i18n';
import { PinIcon } from '../shared/PinIcon';
import styles from '../../../gallery/ResultsGallery.module.css';

function SelectableGalleryItem({ item, context, children }: { item: GalleryItem; context: GalleryLayoutContext; children: ReactNode }) {
  const { t } = useI18n();
  const selected = context.selection.isSelected(item);
  return (
    <div className={`${styles.selectableItem} ${selected ? styles.selectableItemSelected : ''}`}>
      {item.pinned && <span className={styles.pinBadge}><PinIcon className={styles.pinBadgeIcon} /></span>}
      {context.selection.mode && (
        <button
          type="button"
          className={styles.selectButton}
          data-selected={selected}
          onClick={() => context.selection.toggleItem(item)}
          aria-label={selected ? t('gallery.selectionUnselectItem') : t('gallery.selectionSelectItem')}
          aria-pressed={selected}
        >
          {selected ? '✓' : ''}
        </button>
      )}
      <div onClickCapture={(event) => {
        if (!context.selection.mode) return;
        event.preventDefault();
        event.stopPropagation();
        context.selection.toggleItem(item);
      }}>
        {children}
      </div>
    </div>
  );
}

export function GalleryGridSection({ context }: ElementDefinitionProps<GalleryLayoutContext>) {
  const { t } = useI18n();

  return (
    <>
      <div className={styles.wallWorkspace} data-gallery-slot="workspace">
        <div className={styles.imageWall} data-gallery-slot="image-wall">
          {context.items.map((item, index) => item.kind === 'folder' ? (
            <SelectableGalleryItem key={item.id} item={item} context={context}>
              <SlotHost<GalleryFolderCardContext>
                slot="gallery/folder-card"
                context={{
                  folder: item,
                  index,
                  onOpenFolder: () => context.commands.setActivePath(item.path),
                  onDeleteFolder: () => context.commands.deleteFolder(item.path),
                  onMoveFolder: (targetPath) => context.commands.moveItem('folder', item.path, targetPath),
                  onSetPinned: () => context.commands.setPinned('folder', item.path, !item.pinned),
                  onSetTags: (tags) => context.commands.setTags('folder', item.path, tags)
                }}
                as={null}
              />
            </SelectableGalleryItem>
          ) : (
            <SelectableGalleryItem key={item.id} item={item} context={context}>
              <SlotHost<GalleryTaskCardContext>
                slot="gallery/card"
                context={{
                  task: item.task,
                  index,
                  onOpenTask: (image) => context.commands.openTaskDetail(item.task, image),
                  onDeleteTask: () => context.commands.deleteTask(item.task.id),
                  onCancelTask: () => context.commands.cancelTask(item.task.id),
                  onMoveTask: (targetPath) => context.commands.moveItem('task', item.task.id, targetPath),
                  pinned: item.pinned,
                  tags: item.tags,
                  onSetPinned: () => context.commands.setPinned('task', item.task.id, !item.pinned),
                  onSetTags: (tags) => context.commands.setTags('task', item.task.id, tags),
                  onStartHiresFix: (image) => context.commands.startHiresFix(item.task, image)
                }}
                as={null}
              />
            </SelectableGalleryItem>
          ))}
        </div>
      </div>
      {context.archive.hasMore && (
        <div className={styles.loadMoreWrap}>
          <button type="button" className={styles.loadMoreButton} onClick={context.archive.showMore}>
            {t('gallery.loadMore', { count: Math.min(context.archive.pageSize, context.archive.filteredCount - context.archive.visibleCount) })}
          </button>
          <span>{t('gallery.visibleSummary', { visible: context.archive.visibleCount, filtered: context.archive.filteredCount })}</span>
        </div>
      )}
    </>
  );
}
