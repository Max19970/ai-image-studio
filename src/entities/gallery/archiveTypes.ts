import type { GenerationStatus } from '../../domain/generationTask';

export type GalleryStatusFilter = 'all' | 'active' | 'terminal' | GenerationStatus;
export type GalleryKindFilter = 'all' | 'single' | 'batch';
export type GallerySortMode = 'newest' | 'oldest' | 'updated' | 'images';

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
