import type { ElementDefinition } from '../../../../interface/registry/types';
import type { DetailActionContext } from '../../../../interface/context/workspace/detail';
import { lazyElementComponent } from '../../../../interface/registry/lazyElement';

export default {
  id: 'detail.copyParams',
  label: 'Copy sent parameters',
  Component: lazyElementComponent(() => import('./CopyParamsAction'), 'CopyParamsAction'),
  enabled: (context) => !context.isBatchSnapshot
} satisfies ElementDefinition<DetailActionContext>;
