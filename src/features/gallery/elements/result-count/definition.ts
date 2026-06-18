import type { ElementDefinition } from '../../../../interface/registry/types';
import type { GalleryHeaderActionContext } from '../../../../interface/context/workspace/gallery';
import { ResultCountPillAction } from './ResultCountPillAction';

export default {
  id: 'gallery.resultCount',
  label: 'Gallery result count',
  Component: ResultCountPillAction
} satisfies ElementDefinition<GalleryHeaderActionContext>;
