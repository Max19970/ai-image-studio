import { useEffect, useMemo, useState } from 'react';
import type { GenerationTask } from '../../../domain/generationTask';
import type { GalleryCommands } from '../../../interface/context/commands';
import type { GalleryArchiveControls } from '../../../interface/context/workspace/gallery';
import type { GalleryKindFilter, GallerySortMode, GalleryStatusFilter } from '../../../entities/gallery/archiveTypes';
import { galleryArchivePageSize, resolveGalleryArchive } from './galleryArchive';

export function useGalleryArchiveState(tasks: GenerationTask[], commands: GalleryCommands): {
  archiveResult: ReturnType<typeof resolveGalleryArchive>;
  archive: GalleryArchiveControls;
} {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<GalleryStatusFilter>('all');
  const [kindFilter, setKindFilter] = useState<GalleryKindFilter>('all');
  const [tagFilter, setTagFilter] = useState('');
  const [sort, setSort] = useState<GallerySortMode>('newest');
  const [visibleLimit, setVisibleLimit] = useState(galleryArchivePageSize);

  useEffect(() => {
    setVisibleLimit(galleryArchivePageSize);
  }, [query, statusFilter, kindFilter, tagFilter, sort, tasks.length, commands.activePath]);

  const archiveResult = useMemo(
    () => resolveGalleryArchive(tasks, { query, statusFilter, kindFilter, tagFilter, sort, visibleLimit }, {
      folders: commands.galleryFolders,
      pins: commands.galleryPins,
      tags: commands.galleryTagRecords,
      activePath: commands.activePath
    }),
    [tasks, query, statusFilter, kindFilter, tagFilter, sort, visibleLimit, commands.galleryFolders, commands.galleryPins, commands.galleryTagRecords, commands.activePath]
  );

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

  return { archiveResult, archive };
}
