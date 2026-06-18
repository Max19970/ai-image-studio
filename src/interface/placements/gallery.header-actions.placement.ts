import type { ElementPlacement } from '../registry/types';
import type { GalleryHeaderActionContext } from '../context/workspace/gallery';

export default [
  {
    id: 'gallery.header.clear-results',
    slot: 'gallery/header-actions',
    use: 'gallery.clearResults',
    order: 10,
    requiresFeature: 'galleryClear'
  },
  {
    id: 'gallery.header.history-link',
    slot: 'gallery/header-actions',
    use: 'gallery.historyLink',
    order: 20,
    requiresFeature: 'galleryHistory'
  },
  {
    id: 'gallery.header.result-count',
    slot: 'gallery/header-actions',
    use: 'gallery.resultCount',
    order: 30
  }
] satisfies ElementPlacement<GalleryHeaderActionContext>[];
