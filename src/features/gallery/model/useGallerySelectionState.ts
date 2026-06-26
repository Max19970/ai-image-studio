import { useMemo, useState } from 'react';
import { downloadGenerationTasksArchive } from '../../../infrastructure/api';
import type { GalleryClipboardItemPayload, GalleryClipboardOperation, GalleryClipboardState } from '../../../entities/gallery/galleryClipboard';
import type { GalleryItem } from '../../../entities/gallery/galleryItems';
import type { GalleryCommands } from '../../../interface/context/commands';
import type { GallerySelectionContext } from '../../../interface/context/workspace/gallery';
import type { GalleryArchiveResult } from './galleryArchive';

function itemClipboardPayload(item: GalleryItem): GalleryClipboardItemPayload {
  return item.kind === 'folder'
    ? { itemKind: 'folder', itemId: item.path, sourcePath: item.path }
    : { itemKind: 'task', itemId: item.task.id, sourcePath: item.path };
}

export function useGallerySelectionState(
  archiveResult: GalleryArchiveResult,
  commands: GalleryCommands
): GallerySelectionContext {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [clipboard, setClipboard] = useState<GalleryClipboardState | null>(null);

  const selectedItems = useMemo(
    () => archiveResult.items.filter((item) => selectedIds.has(item.id)).map(itemClipboardPayload),
    [archiveResult.items, selectedIds]
  );
  const selectedTaskIds = useMemo(
    () => archiveResult.items.flatMap((item) => item.kind === 'task' && selectedIds.has(item.id) ? [item.task.id] : []),
    [archiveResult.items, selectedIds]
  );

  const clearSelection = () => setSelectedIds(new Set());

  return useMemo(() => ({
    mode: selectionMode,
    selectedIds,
    selectedItems,
    selectedTaskIds,
    clipboard,
    begin: () => setSelectionMode(true),
    cancel: () => {
      setSelectionMode(false);
      clearSelection();
    },
    selectVisible: () => {
      setSelectionMode(true);
      setSelectedIds(new Set(archiveResult.items.map((item) => item.id)));
    },
    clearSelection,
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
    downloadSelected: async () => {
      if (selectedTaskIds.length === 0) return;
      await downloadGenerationTasksArchive(selectedTaskIds);
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
  }), [selectionMode, selectedIds, selectedItems, selectedTaskIds, clipboard, commands, archiveResult.items]);
}
