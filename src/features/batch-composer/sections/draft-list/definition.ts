import type { ElementDefinition } from '../../../../interface/registry/types';
import type { BatchComposerLayoutContext } from '../../batchComposerTypes';
import { lazyElementComponent } from '../../../../interface/registry/lazyElement';

export default {
  id: 'batchComposer.sections.draftList',
  label: 'Batch composer draft list section',
  Component: lazyElementComponent(() => import('./BatchDraftListSection'), 'BatchDraftListSection')
} satisfies ElementDefinition<BatchComposerLayoutContext>;
