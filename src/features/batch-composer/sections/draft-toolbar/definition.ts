import type { ElementDefinition } from '../../../../interface/registry/types';
import type { BatchDraftLayoutContext } from '../../batchComposerTypes';
import { BatchDraftToolbarSection } from './BatchDraftToolbarSection';

export default {
  id: 'batchComposer.sections.draftToolbar',
  label: 'Batch composer draft model and asset toolbar section',
  Component: BatchDraftToolbarSection
} satisfies ElementDefinition<BatchDraftLayoutContext>;
