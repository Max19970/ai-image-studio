import type { ElementDefinition } from '../../../../interface/registry/types';
import type { BatchComposerLayoutContext } from '../../batchComposerTypes';
import { BatchDraftListSection } from './BatchDraftListSection';

export default {
  id: 'batchComposer.sections.draftList',
  label: 'Batch composer draft list section',
  Component: BatchDraftListSection
} satisfies ElementDefinition<BatchComposerLayoutContext>;
