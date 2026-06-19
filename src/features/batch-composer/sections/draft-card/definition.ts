import type { ElementDefinition } from '../../../../interface/registry/types';
import type { BatchDraftLayoutContext } from '../../batchComposerTypes';
import { lazyElementComponent } from '../../../../interface/registry/lazyElement';

export default {
  id: 'batchComposer.sections.draftCard',
  label: 'Batch composer draft card section',
  Component: lazyElementComponent(() => import('./BatchDraftCardSection'), 'BatchDraftCardSection')
} satisfies ElementDefinition<BatchDraftLayoutContext>;
