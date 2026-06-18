import type { ElementDefinition } from '../../../../interface/registry/types';
import type { BatchComposerLayoutContext } from '../../batchComposerTypes';
import { BatchComposerFooterSection } from './BatchComposerFooterSection';

export default {
  id: 'batchComposer.sections.footer',
  label: 'Batch composer footer actions',
  Component: BatchComposerFooterSection
} satisfies ElementDefinition<BatchComposerLayoutContext>;
