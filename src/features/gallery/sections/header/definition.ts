import type { ElementDefinition } from '../../../../interface/registry/types';
import type { GalleryLayoutContext } from '../../../../interface/context/workspace/gallery';
import { GalleryHeaderSection } from './GalleryHeaderSection';

export default {
  id: 'gallery.sections.header',
  label: 'Gallery header section',
  Component: GalleryHeaderSection
} satisfies ElementDefinition<GalleryLayoutContext>;
