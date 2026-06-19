import type { ElementDefinition } from '../../../../interface/registry/types';
import type { DetailLayoutContext } from '../../../../interface/context/workspace/detail';
import { lazyElementComponent } from '../../../../interface/registry/lazyElement';

export default {
  id: 'detail.sections.requestDrawer',
  label: 'Detail request drawer section',
  Component: lazyElementComponent(() => import('./DetailRequestDrawerSection'), 'DetailRequestDrawerSection')
} satisfies ElementDefinition<DetailLayoutContext>;
