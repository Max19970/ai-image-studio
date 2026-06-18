import type { ElementDefinition } from '../../../../interface/registry/types';
import type { GalleryTaskCardContext } from '../../../../interface/context/workspace/gallery';
import { GalleryResultCardSection } from './GalleryResultCardSection';

export default {
  id: 'gallery.sections.resultCard',
  label: 'Gallery generated image card section',
  Component: GalleryResultCardSection,
  enabled: (context) => context.task.images.length > 0
} satisfies ElementDefinition<GalleryTaskCardContext>;
