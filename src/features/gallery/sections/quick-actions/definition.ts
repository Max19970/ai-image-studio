import type { ElementDefinition } from '../../../../interface/registry/types';
import type { GalleryCardActionContext } from '../../../../interface/context/workspace/gallery';
import { GalleryQuickActionsSection } from './GalleryQuickActionsSection';

export default {
  id: 'gallery.sections.quickActions',
  label: 'Gallery quick actions menu',
  Component: GalleryQuickActionsSection
} satisfies ElementDefinition<GalleryCardActionContext>;
