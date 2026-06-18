import type { ElementDefinition } from '../../../../interface/registry/types';
import type { DetailActionContext } from '../../../../interface/context/workspace/detail';
import { CopyPromptAction } from './CopyPromptAction';

export default {
  id: 'detail.copyPrompt',
  label: 'Copy prompt',
  Component: CopyPromptAction
} satisfies ElementDefinition<DetailActionContext>;
