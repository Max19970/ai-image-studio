import type { GalleryLayoutContext, GalleryTaskCardContext } from '../context/workspace/gallery';
import type { ElementPlacement } from '../registry/types';

const galleryLayoutPlacements = [
  {
    id: 'gallery.layout.header',
    slot: 'gallery/header',
    use: 'gallery.sections.header',
    order: 10
  },
  {
    id: 'gallery.layout.empty',
    slot: 'gallery/content',
    use: 'gallery.sections.empty',
    order: 10,
    enabled: (context) => context.archive.totalCount === 0 || context.archive.filteredCount === 0
  },
  {
    id: 'gallery.layout.grid',
    slot: 'gallery/content',
    use: 'gallery.sections.grid',
    order: 20,
    enabled: (context) => context.archive.filteredCount > 0
  }
] satisfies ElementPlacement<GalleryLayoutContext>[];

const galleryCardPlacements = [
  {
    id: 'gallery.card.placeholder',
    slot: 'gallery/card',
    use: 'gallery.sections.placeholderCard',
    order: 10,
    enabled: (context) => context.task.images.length === 0
  },
  {
    id: 'gallery.card.result',
    slot: 'gallery/card',
    use: 'gallery.sections.resultCard',
    order: 20,
    enabled: (context) => context.task.images.length > 0
  }
] satisfies ElementPlacement<GalleryTaskCardContext>[];

export default [
  ...galleryLayoutPlacements,
  ...galleryCardPlacements
] satisfies ElementPlacement<any>[];
