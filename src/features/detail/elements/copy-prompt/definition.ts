import type { ElementDefinition } from '../../../../interface/registry/types';
import type { DetailActionContext } from '../../../../interface/context/workspace/detail';
import { lazyElementComponent } from '../../../../interface/registry/lazyElement';

export default {
  id: 'detail.copyPrompt',
  label: 'Copy prompt',
  Component: lazyElementComponent(() => import('./CopyPromptAction'), 'CopyPromptAction')
} satisfies ElementDefinition<DetailActionContext>;
