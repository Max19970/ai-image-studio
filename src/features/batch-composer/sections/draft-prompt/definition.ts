import type { ElementDefinition } from '../../../../interface/registry/types';
import type { BatchDraftLayoutContext } from '../../batchComposerTypes';
import { BatchDraftPromptSection } from './BatchDraftPromptSection';

export default {
  id: 'batchComposer.sections.draftPrompt',
  label: 'Batch composer draft prompt section',
  Component: BatchDraftPromptSection
} satisfies ElementDefinition<BatchDraftLayoutContext>;
