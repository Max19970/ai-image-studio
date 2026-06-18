import type { ElementDefinition } from '../../../../interface/registry/types';
import type { BatchDraftLayoutContext } from '../../batchComposerTypes';
import { BatchDraftHeaderSection } from './BatchDraftHeaderSection';

export default {
  id: 'batchComposer.sections.draftHeader',
  label: 'Batch composer draft header section',
  Component: BatchDraftHeaderSection
} satisfies ElementDefinition<BatchDraftLayoutContext>;
