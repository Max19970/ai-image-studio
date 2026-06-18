import { useEffect, useMemo, useState } from 'react';
import type { GenerationTask } from '../../domain/generationTask';
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

export function ResultsGallery({ tasks, busy, commands }: Props) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<GalleryStatusFilter>('all');
  const [kindFilter, setKindFilter] = useState<GalleryKindFilter>('all');
  const [sort, setSort] = useState<GallerySortMode>('newest');
  const [visibleLimit, setVisibleLimit] = useState(galleryArchivePageSize);

  useEffect(() => {
    setVisibleLimit(galleryArchivePageSize);
  }, [query, statusFilter, kindFilter, sort, tasks.length]);

  const archiveResult = useMemo(
    () => resolveGalleryArchive(tasks, { query, statusFilter, kindFilter, sort, visibleLimit }),
    [tasks, query, statusFilter, kindFilter, sort, visibleLimit]
  );

  const archive = useMemo(() => ({
    ...archiveResult.summary,
    query,
    statusFilter,
    kindFilter,
    sort,
    pageSize: galleryArchivePageSize,
    setQuery,
    setStatusFilter,
    setKindFilter,
    setSort,
    showMore: () => setVisibleLimit((value) => value + galleryArchivePageSize),
    reset: () => {
      setQuery('');
      setStatusFilter('all');
      setKindFilter('all');
      setSort('newest');
      setVisibleLimit(galleryArchivePageSize);
    },
    deleteFiltered: () => {
      for (const task of archiveResult.filteredTasks) commands.deleteTask(task.id);
      setVisibleLimit(galleryArchivePageSize);
    }
  }), [archiveResult.summary, archiveResult.filteredTasks, query, statusFilter, kindFilter, sort, commands]);

  const hasCards = tasks.length > 0;
  const context: GalleryLayoutContext = { tasks: archiveResult.tasks, busy, commands, archive };

  return (
    <section className={cx(styles.stage, hasCards ? styles.hasResults : styles.isEmpty)}>
      <SlotHost<GalleryLayoutContext> slot="gallery/header" context={context} as={null} />
      <SlotHost<GalleryLayoutContext> slot="gallery/content" context={context} as={null} />
    </section>
  );
}
