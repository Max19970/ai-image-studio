import type { ElementDefinition } from '../../../../interface/registry/types';
import type { GalleryFolderCardContext } from '../../../../interface/context/workspace/gallery';
import { GalleryFolderCardSection } from './GalleryFolderCardSection';

export default {
  id: 'gallery.sections.folderCard',
  label: 'Gallery folder card section',
  Component: GalleryFolderCardSection
} satisfies ElementDefinition<GalleryFolderCardContext>;
