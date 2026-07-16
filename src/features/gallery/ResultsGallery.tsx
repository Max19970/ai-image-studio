import { useEffect, useState } from 'react';
import type { GenerationTask } from '../../domain/generationTask';
import type { GalleryCommands } from '../../interface/context/commands';
import { SlotHost } from '../../interface/SlotHost';
import type { GalleryLayoutContext } from '../../interface/context/workspace/gallery';
import { useI18n } from '../../i18n';
import { useGalleryArchiveState } from './model/useGalleryArchiveState';
import { useGalleryFolderTreeLayout } from './model/useGalleryFolderTreeLayout';
import { useGallerySelectionState } from './model/useGallerySelectionState';
import { GalleryExplorerBar } from './sections/filesystem/GalleryExplorerBar';
import { GalleryFolderTree } from './sections/filesystem/GalleryFolderTree';
import { GalleryArchiveControls } from './sections/header/GalleryArchiveControls';
import shellStyles from './GalleryFilesystemShell.module.css';

interface Props {
  tasks: GenerationTask[];
  busy: boolean;
  commands: GalleryCommands;
}

export function ResultsGallery({ tasks, busy, commands }: Props) {
  const { t } = useI18n();
  const { archiveResult, archive } = useGalleryArchiveState(tasks, commands);
  const selection = useGallerySelectionState(archiveResult, commands);
  const treeLayout = useGalleryFolderTreeLayout();
  const [archiveControlsOpen, setArchiveControlsOpen] = useState(true);
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

  useEffect(() => {
    if (selection.mode) document.documentElement.dataset.gallerySelectionMode = 'true';
    else delete document.documentElement.dataset.gallerySelectionMode;
    return () => { delete document.documentElement.dataset.gallerySelectionMode; };
  }, [selection.mode]);

  return (
    <section className={shellStyles.stage} data-gallery-workspace-root>
      <SlotHost<GalleryLayoutContext> slot="gallery/header" context={context} as={null} />
      <div
        className={shellStyles.filesystemShell}
        data-tree-visible={treeLayout.treeVisible}
        data-tree-resizing={treeLayout.resizing}
        style={treeLayout.shellStyle}
      >
        <aside
          className={shellStyles.folderRail}
          aria-hidden={!treeLayout.treeVisible}
          inert={!treeLayout.treeVisible}
        >
          <div className={shellStyles.folderRailSurface}>
            <GalleryFolderTree context={context} />
          </div>
          <button
            type="button"
            className={shellStyles.folderRailResizeHandle}
            aria-label={t('gallery.folderTreeResize')}
            tabIndex={treeLayout.treeVisible ? 0 : -1}
            {...treeLayout.resizeHandleProps}
          />
        </aside>
        <div className={shellStyles.contentColumn}>
          <GalleryExplorerBar
            context={context}
            treeVisible={treeLayout.treeVisible}
            archiveControlsOpen={archiveControlsOpen}
            onToggleTree={treeLayout.toggleTree}
            onToggleArchiveControls={() => setArchiveControlsOpen((open) => !open)}
          />
          <GalleryArchiveControls context={context} open={archiveControlsOpen} />
          <SlotHost<GalleryLayoutContext> slot="gallery/content" context={context} as={null} />
        </div>
      </div>
    </section>
  );
}
