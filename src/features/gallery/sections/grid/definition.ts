import type { ElementDefinition } from '../../../../interface/registry/types';
import type { GalleryLayoutContext } from '../../../../interface/context/workspace/gallery';
import { GalleryGridSection } from './GalleryGridSection';

export default {
  id: 'gallery.sections.grid',
  label: 'Gallery task grid section',
  Component: GalleryGridSection,
  enabled: (context) => context.items.length > 0
} satisfies ElementDefinition<GalleryLayoutContext>;
