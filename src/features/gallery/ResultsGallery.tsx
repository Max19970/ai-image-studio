import { useEffect, useMemo, useState } from 'react';
import type { GenerationTask } from '../../domain/generationTask';
import type { GalleryClipboardItemPayload, GalleryClipboardOperation, GalleryClipboardState } from '../../entities/gallery/galleryClipboard';
import type { GalleryItem } from '../../entities/gallery/galleryItems';
import type { GalleryCommands } from '../../interface/context/commands';
import { SlotHost } from '../../interface/SlotHost';
import type { GalleryLayoutContext } from '../../interface/context/workspace/gallery';
import type { GalleryKindFilter, GallerySortMode, GalleryStatusFilter } from '../../entities/gallery/archiveTypes';
import { galleryArchivePageSize, resolveGalleryArchive } from './model/galleryArchive';
import styles from './ResultsGallery.module.css';

interface Props {
  tasks: GenerationTask[];
  busy: boolean;
  commands: GalleryCommands;
}

const cx = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ');

function itemClipboardPayload(item: GalleryItem): GalleryClipboardItemPayload {
  return item.kind === 'folder'
    ? { itemKind: 'folder', itemId: item.path, sourcePath: item.path }
    : { itemKind: 'task', itemId: item.task.id, sourcePath: item.path };
}

export function ResultsGallery({ tasks, busy, commands }: Props) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<GalleryStatusFilter>('all');
  const [kindFilter, setKindFilter] = useState<GalleryKindFilter>('all');
  const [tagFilter, setTagFilter] = useState('');
  const [sort, setSort] = useState<GallerySortMode>('newest');
  const [visibleLimit, setVisibleLimit] = useState(galleryArchivePageSize);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [clipboard, setClipboard] = useState<GalleryClipboardState | null>(null);

  useEffect(() => {
    setVisibleLimit(galleryArchivePageSize);
  }, [query, statusFilter, kindFilter, tagFilter, sort, tasks.length, commands.activePath]);

  const archiveResult = useMemo(
    () => resolveGalleryArchive(tasks, { query, statusFilter, kindFilter, tagFilter, sort, visibleLimit }, { folders: commands.galleryFolders, pins: commands.galleryPins, tags: commands.galleryTagRecords, activePath: commands.activePath }),
    [tasks, query, statusFilter, kindFilter, tagFilter, sort, visibleLimit, commands.galleryFolders, commands.galleryPins, commands.galleryTagRecords, commands.activePath]
  );

  const selectedItems = useMemo(
    () => archiveResult.items.filter((item) => selectedIds.has(item.id)).map(itemClipboardPayload),
    [archiveResult.items, selectedIds]
  );

  const clearSelection = () => setSelectedIds(new Set());

  const archive = useMemo(() => ({
    ...archiveResult.summary,
    query,
    statusFilter,
    kindFilter,
    tagFilter,
    sort,
    pageSize: galleryArchivePageSize,
    setQuery,
    setStatusFilter,
    setKindFilter,
    setTagFilter,
    setSort,
    showMore: () => setVisibleLimit((value) => value + galleryArchivePageSize),
    reset: () => {
      setQuery('');
      setStatusFilter('all');
      setKindFilter('all');
      setTagFilter('');
      setSort('newest');
      setVisibleLimit(galleryArchivePageSize);
    },
    deleteFiltered: () => {
      for (const task of archiveResult.filteredTasks) commands.deleteTask(task.id);
      setVisibleLimit(galleryArchivePageSize);
    }
  }), [archiveResult.summary, archiveResult.filteredTasks, query, statusFilter, kindFilter, tagFilter, sort, commands]);

  const selection = useMemo(() => ({
    mode: selectionMode,
    selectedIds,
    selectedItems,
    clipboard,
    begin: () => setSelectionMode(true),
    cancel: () => {
      setSelectionMode(false);
      clearSelection();
    },
    toggleItem: (item: GalleryItem) => {
      setSelectionMode(true);
      setSelectedIds((current) => {
        const next = new Set(current);
        if (next.has(item.id)) next.delete(item.id);
        else next.add(item.id);
        return next;
      });
    },
    isSelected: (item: GalleryItem) => selectedIds.has(item.id),
    copyToClipboard: (operation: GalleryClipboardOperation) => {
      if (selectedItems.length === 0) return;
      setClipboard({ operation, items: selectedItems });
      setSelectionMode(false);
      clearSelection();
    },
    pasteToActivePath: async () => {
      if (!clipboard) return;
      await commands.pasteItems(clipboard.operation, clipboard.items, commands.activePath);
      setClipboard(null);
      clearSelection();
    },
    deleteSelected: () => {
      for (const item of archiveResult.items) {
        if (!selectedIds.has(item.id)) continue;
        if (item.kind === 'folder') void commands.deleteFolder(item.path);
        else commands.deleteTask(item.task.id);
      }
      clearSelection();
      setSelectionMode(false);
    }
  }), [selectionMode, selectedIds, selectedItems, clipboard, commands, archiveResult.items]);

  const hasCards = archiveResult.summary.totalCount > 0;
  const context: GalleryLayoutContext = {
    tasks: archiveResult.tasks,
    items: archiveResult.items,
    allTasks: tasks,
    folders: commands.galleryFolders,
    activePath: commands.activePath,
    busy,
    commands,
    archive,
    selection
  };

  return (
    <section className={cx(styles.stage, hasCards ? styles.hasResults : styles.isEmpty)}>
      <SlotHost<GalleryLayoutContext> slot="gallery/header" context={context} as={null} />
      <SlotHost<GalleryLayoutContext> slot="gallery/content" context={context} as={null} />
    </section>
  );
}
