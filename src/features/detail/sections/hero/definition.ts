import type { ElementDefinition } from '../../../../interface/registry/types';
import type { DetailLayoutContext } from '../../../../interface/context/workspace/detail';
import { lazyElementComponent } from '../../../../interface/registry/lazyElement';

export default {
  id: 'detail.sections.hero',
  label: 'Detail hero section',
  Component: lazyElementComponent(() => import('./DetailHeroSection'), 'DetailHeroSection')
} satisfies ElementDefinition<DetailLayoutContext>;
