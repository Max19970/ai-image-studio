import type { ElementDefinition } from '../../../../interface/registry/types';
import type { BatchDraftLayoutContext } from '../../batchComposerTypes';
import { BatchDraftModeSection } from './BatchDraftModeSection';

export default {
  id: 'batchComposer.sections.draftMode',
  label: 'Batch composer draft mode section',
  Component: BatchDraftModeSection
} satisfies ElementDefinition<BatchDraftLayoutContext>;
