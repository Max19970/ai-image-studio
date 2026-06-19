import type { ElementDefinition } from '../../../../interface/registry/types';
import type { BatchComposerLayoutContext } from '../../batchComposerTypes';
import { lazyElementComponent } from '../../../../interface/registry/lazyElement';

export default {
  id: 'batchComposer.sections.header',
  label: 'Batch composer header section',
  Component: lazyElementComponent(() => import('./BatchComposerHeaderSection'), 'BatchComposerHeaderSection')
} satisfies ElementDefinition<BatchComposerLayoutContext>;
