import type { ElementDefinition } from '../../../../interface/registry/types';
import type { GalleryTaskCardContext } from '../../../../interface/context/workspace/gallery';
import { GalleryPlaceholderCardSection } from './GalleryPlaceholderCardSection';

export default {
  id: 'gallery.sections.placeholderCard',
  label: 'Gallery placeholder/status card section',
  Component: GalleryPlaceholderCardSection,
  enabled: (context) => context.task.images.length === 0
} satisfies ElementDefinition<GalleryTaskCardContext>;
