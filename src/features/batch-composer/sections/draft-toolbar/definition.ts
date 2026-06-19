import type { ElementDefinition } from '../../../../interface/registry/types';
import type { BatchDraftLayoutContext } from '../../batchComposerTypes';
import { lazyElementComponent } from '../../../../interface/registry/lazyElement';

export default {
  id: 'batchComposer.sections.draftToolbar',
  label: 'Batch composer draft model and asset toolbar section',
  Component: lazyElementComponent(() => import('./BatchDraftToolbarSection'), 'BatchDraftToolbarSection')
} satisfies ElementDefinition<BatchDraftLayoutContext>;
