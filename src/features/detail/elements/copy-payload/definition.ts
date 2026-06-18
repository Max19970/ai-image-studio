import type { ElementDefinition } from '../../../../interface/registry/types';
import type { DetailActionContext } from '../../../../interface/context/workspace/detail';
import { CopyPayloadAction } from './CopyPayloadAction';

export default {
  id: 'detail.copyPayload',
  label: 'Copy payload',
  Component: CopyPayloadAction
} satisfies ElementDefinition<DetailActionContext>;
