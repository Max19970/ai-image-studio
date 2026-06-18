import type { ElementDefinition } from '../../../../interface/registry/types';
import type { GalleryHeaderActionContext } from '../../../../interface/context/workspace/gallery';
import { HistoryLinkAction } from './HistoryLinkAction';

export default {
  id: 'gallery.historyLink',
  label: 'Gallery history link',
  Component: HistoryLinkAction
} satisfies ElementDefinition<GalleryHeaderActionContext>;
