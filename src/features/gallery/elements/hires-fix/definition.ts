import type { ElementDefinition } from '../../../../interface/registry/types';
import type { GalleryCardActionContext } from '../../../../interface/context/workspace/gallery';
import { HiresFixGalleryAction } from './HiresFixGalleryAction';

export default {
  id: 'gallery.hiresFix',
  label: 'Start Hires Fix from gallery image',
  Component: HiresFixGalleryAction
} satisfies ElementDefinition<GalleryCardActionContext>;
