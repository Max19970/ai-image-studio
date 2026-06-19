import type { ElementDefinition } from '../../../../interface/registry/types';
import type { DetailActionContext } from '../../../../interface/context/workspace/detail';
import { lazyElementComponent } from '../../../../interface/registry/lazyElement';

export default {
  id: 'detail.copyMenu',
  label: 'Detail grouped copy menu action',
  Component: lazyElementComponent(() => import('./DetailCopyMenuAction'), 'DetailCopyMenuAction')
} satisfies ElementDefinition<DetailActionContext>;
