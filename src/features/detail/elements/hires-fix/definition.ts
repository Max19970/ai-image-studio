import type { ElementDefinition } from '../../../../interface/registry/types';
import type { DetailActionContext } from '../../../../interface/context/workspace/detail';
import { lazyElementComponent } from '../../../../interface/registry/lazyElement';

export default {
  id: 'detail.hiresFix',
  label: 'Run Hires Fix for selected image',
  Component: lazyElementComponent(() => import('./DetailHiresFixAction'), 'DetailHiresFixAction'),
  enabled: (context) => Boolean(context.activeImage && context.onStartHiresFix)
} satisfies ElementDefinition<DetailActionContext>;
