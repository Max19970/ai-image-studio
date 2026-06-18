import type { ElementDefinition } from '../../../../interface/registry/types';
import type { WorkspaceMainContext } from '../../../../interface/context/workspace/main';
import { WorkspaceGallerySection } from './WorkspaceGallerySection';

export default {
  id: 'workspace.galleryPage',
  label: 'Workspace gallery page',
  Component: WorkspaceGallerySection
} satisfies ElementDefinition<WorkspaceMainContext>;
