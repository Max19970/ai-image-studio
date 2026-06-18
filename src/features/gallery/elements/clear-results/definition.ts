import type { ElementDefinition } from '../../../../interface/registry/types';
import type { GalleryHeaderActionContext } from '../../../../interface/context/workspace/gallery';
import { ClearResultsAction } from './ClearResultsAction';

export default {
  id: 'gallery.clearResults',
  label: 'Clear gallery results',
  Component: ClearResultsAction,
  enabled: (context) => context.tasks.length > 0
} satisfies ElementDefinition<GalleryHeaderActionContext>;
