import type { ElementDefinition } from '../../../../interface/registry/types';
import type { GalleryLayoutContext } from '../../../../interface/context/workspace/gallery';
import { GalleryEmptySection } from './GalleryEmptySection';

export default {
  id: 'gallery.sections.empty',
  label: 'Gallery empty state section',
  Component: GalleryEmptySection,
  enabled: (context) => context.items.length === 0
} satisfies ElementDefinition<GalleryLayoutContext>;
