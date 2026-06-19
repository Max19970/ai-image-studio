import type { ElementDefinition } from '../../../../interface/registry/types';
import type { BatchComposerLayoutContext } from '../../batchComposerTypes';
import { lazyElementComponent } from '../../../../interface/registry/lazyElement';

export default {
  id: 'batchComposer.sections.controls',
  label: 'Batch composer interval and summary controls',
  Component: lazyElementComponent(() => import('./BatchComposerControlsSection'), 'BatchComposerControlsSection')
} satisfies ElementDefinition<BatchComposerLayoutContext>;
