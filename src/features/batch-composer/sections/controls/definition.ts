import type { ElementDefinition } from '../../../../interface/registry/types';
import type { BatchComposerLayoutContext } from '../../batchComposerTypes';
import { BatchComposerControlsSection } from './BatchComposerControlsSection';

export default {
  id: 'batchComposer.sections.controls',
  label: 'Batch composer interval and summary controls',
  Component: BatchComposerControlsSection
} satisfies ElementDefinition<BatchComposerLayoutContext>;
