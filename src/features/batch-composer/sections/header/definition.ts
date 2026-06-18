import type { ElementDefinition } from '../../../../interface/registry/types';
import type { BatchComposerLayoutContext } from '../../batchComposerTypes';
import { BatchComposerHeaderSection } from './BatchComposerHeaderSection';

export default {
  id: 'batchComposer.sections.header',
  label: 'Batch composer header section',
  Component: BatchComposerHeaderSection
} satisfies ElementDefinition<BatchComposerLayoutContext>;
