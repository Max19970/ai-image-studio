import type { ElementDefinition } from '../../../../interface/registry/types';
import type { DetailActionContext } from '../../../../interface/context/workspace/detail';
import { CopyParamsAction } from './CopyParamsAction';

export default {
  id: 'detail.copyParams',
  label: 'Copy sent parameters',
  Component: CopyParamsAction,
  enabled: (context) => !context.isBatchSnapshot
} satisfies ElementDefinition<DetailActionContext>;
