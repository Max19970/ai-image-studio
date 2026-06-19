import type { ElementDefinition } from '../../../../interface/registry/types';
import type { BatchDraftLayoutContext } from '../../batchComposerTypes';
import { lazyElementComponent } from '../../../../interface/registry/lazyElement';

export default {
  id: 'batchComposer.sections.draftPrompt',
  label: 'Batch composer draft prompt section',
  Component: lazyElementComponent(() => import('./BatchDraftPromptSection'), 'BatchDraftPromptSection')
} satisfies ElementDefinition<BatchDraftLayoutContext>;
