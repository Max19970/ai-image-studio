import type { ElementPlacement } from '../registry/types';
import type { GalleryHeaderActionContext } from '../context/workspace/gallery';

export default [
  {
    id: 'gallery.header.clear-results',
    slot: 'gallery/header-actions',
    use: 'gallery.clearResults',
    order: 10,
    requiresFeature: 'galleryClear'
  }] satisfies ElementPlacement<GalleryHeaderActionContext>[];
