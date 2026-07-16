import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import { SlotHost } from '../../../../interface/SlotHost';
import type { GalleryFolderCardContext, GalleryLayoutContext, GalleryTaskCardContext } from '../../../../interface/context/workspace/gallery';
import { hasGalleryDragPayload, readGalleryDragPayload, writeGalleryDragPayload } from '../../../../entities/gallery/galleryDrag';
import type { GalleryItem } from '../../../../entities/gallery/galleryItems';
import { useI18n } from '../../../../i18n';
import { PinIcon } from '../shared/PinIcon';
import styles from '../../../gallery/ResultsGallery.module.css';

function SelectableGalleryItem({ item, context, children }: { item: GalleryItem; context: GalleryLayoutContext; children: ReactNode }) {
  const { t } = useI18n();
  const selected = context.selection.isSelected(item);
  const [dropActive, setDropActive] = useState(false);
  const longPressTimer = useRef<number | null>(null);
  const longPressTriggered = useRef(false);

  const cancelLongPress = () => {
    if (longPressTimer.current !== null) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  };

  useEffect(() => () => cancelLongPress(), []);

  const moveDroppedItem = (dataTransfer: DataTransfer) => {
    if (item.kind !== 'folder') return;
    const payload = readGalleryDragPayload(dataTransfer);
    if (!payload || (payload.itemKind === 'folder' && payload.itemId === item.path)) return;
    void context.commands.moveItem(payload.itemKind, payload.itemId, item.path).catch((error) => {
      window.alert(error instanceof Error ? error.message : String(error));
    });
  };

  return (
    <div
      data-testid="gallery-item"
      data-gallery-item-id={item.id}
      className={`${styles.selectableItem} ${selected ? styles.selectableItemSelected : ''} ${dropActive ? styles.selectableItemDropTarget : ''}`}
      draggable={!context.selection.mode}
      onClickCapture={(event) => {
        if (longPressTriggered.current) {
          longPressTriggered.current = false;
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        if (!context.selection.mode && !event.ctrlKey && !event.metaKey && !event.shiftKey) return;
        event.preventDefault();
        event.stopPropagation();
        context.selection.toggleItem(item, { range: event.shiftKey });
      }}
      onDragStart={(event) => writeGalleryDragPayload(event.dataTransfer, {
        itemKind: item.kind === 'folder' ? 'folder' : 'task',
        itemId: item.kind === 'folder' ? item.path : item.task.id
      })}
      onPointerDown={(event) => {
        if (event.pointerType !== 'touch') return;
        longPressTriggered.current = false;
        cancelLongPress();
        longPressTimer.current = window.setTimeout(() => {
          longPressTriggered.current = true;
          context.selection.toggleItem(item);
          if ('vibrate' in navigator) navigator.vibrate?.(12);
        }, 450);
      }}
      onPointerUp={cancelLongPress}
      onPointerCancel={cancelLongPress}
      onPointerMove={cancelLongPress}
      onDragEnd={() => setDropActive(false)}
      onDragOver={(event) => {
        if (item.kind !== 'folder' || !hasGalleryDragPayload(event.dataTransfer)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setDropActive(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropActive(false);
      }}
      onDrop={(event) => {
        if (item.kind !== 'folder') return;
        event.preventDefault();
        event.stopPropagation();
        setDropActive(false);
        moveDroppedItem(event.dataTransfer);
      }}
    >
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
      <div>{children}</div>
    </div>
  );
}

export function GalleryGridSection({ context }: ElementDefinitionProps<GalleryLayoutContext>) {
  const { t } = useI18n();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.matches('input, textarea, select, [contenteditable="true"]') || target.closest('[role="dialog"]'))) return;
      if (event.key === 'Escape' && context.selection.mode) {
        event.preventDefault();
        context.selection.cancel();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a' && context.items.length > 0) {
        event.preventDefault();
        context.selection.selectVisible();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [context.items.length, context.selection]);

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
                  onRenameFolder: (name) => context.commands.renameFolder(item.path, name),
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
