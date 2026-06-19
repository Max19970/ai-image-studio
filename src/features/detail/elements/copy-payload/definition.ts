import type { ElementDefinition } from '../../../../interface/registry/types';
import type { DetailActionContext } from '../../../../interface/context/workspace/detail';
import { lazyElementComponent } from '../../../../interface/registry/lazyElement';

export default {
  id: 'detail.copyPayload',
  label: 'Copy payload',
  Component: lazyElementComponent(() => import('./CopyPayloadAction'), 'CopyPayloadAction')
} satisfies ElementDefinition<DetailActionContext>;
