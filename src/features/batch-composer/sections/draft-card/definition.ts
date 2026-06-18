import type { ElementDefinition } from '../../../../interface/registry/types';
import type { BatchDraftLayoutContext } from '../../batchComposerTypes';
import { BatchDraftCardSection } from './BatchDraftCardSection';

export default {
  id: 'batchComposer.sections.draftCard',
  label: 'Batch composer draft card section',
  Component: BatchDraftCardSection
} satisfies ElementDefinition<BatchDraftLayoutContext>;
