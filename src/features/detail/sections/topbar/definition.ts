import type { ElementDefinition } from '../../../../interface/registry/types';
import type { DetailLayoutContext } from '../../../../interface/context/workspace/detail';
import { lazyElementComponent } from '../../../../interface/registry/lazyElement';

export default {
  id: 'detail.sections.topbar',
  label: 'Detail topbar section',
  Component: lazyElementComponent(() => import('./DetailTopbarSection'), 'DetailTopbarSection')
} satisfies ElementDefinition<DetailLayoutContext>;
