import type { GenerationTask } from '../../domain/generationTask';
import type { GalleryCommands } from '../../interface/context/commands';
import { SlotHost } from '../../interface/SlotHost';
import type { GalleryLayoutContext } from '../../interface/context/workspace/gallery';
import { useGalleryArchiveState } from './model/useGalleryArchiveState';
import { useGallerySelectionState } from './model/useGallerySelectionState';
import styles from './ResultsGallery.module.css';

interface Props {
  tasks: GenerationTask[];
  busy: boolean;
  commands: GalleryCommands;
}

const cx = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ');

export function ResultsGallery({ tasks, busy, commands }: Props) {
  const { archiveResult, archive } = useGalleryArchiveState(tasks, commands);
  const selection = useGallerySelectionState(archiveResult, commands);
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
