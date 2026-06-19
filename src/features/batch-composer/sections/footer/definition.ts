import type { ElementDefinition } from '../../../../interface/registry/types';
import type { BatchComposerLayoutContext } from '../../batchComposerTypes';
import { lazyElementComponent } from '../../../../interface/registry/lazyElement';

export default {
  id: 'batchComposer.sections.footer',
  label: 'Batch composer footer actions',
  Component: lazyElementComponent(() => import('./BatchComposerFooterSection'), 'BatchComposerFooterSection')
} satisfies ElementDefinition<BatchComposerLayoutContext>;
