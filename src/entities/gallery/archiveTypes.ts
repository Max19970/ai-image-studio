import type { GenerationStatus } from '../../domain/generationTask';

export type GalleryStatusFilter = GenerationStatus | (string & {});
export type GalleryKindFilter = string & {};
export type GallerySortMode = string & {};

export interface GalleryArchiveSummary {
  totalCount: number;
  filteredCount: number;
  filteredTaskCount: number;
  visibleCount: number;
  totalImages: number;
  filteredImages: number;
  activeCount: number;
  batchCount: number;
  hasFilters: boolean;
  availableTags: string[];
  hasMore: boolean;
}
