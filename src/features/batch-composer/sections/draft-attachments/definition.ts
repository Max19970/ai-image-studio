import type { ElementDefinition } from '../../../../interface/registry/types';
import type { BatchDraftLayoutContext } from '../../batchComposerTypes';
import { BatchDraftAttachmentsSection } from './BatchDraftAttachmentsSection';

export default {
  id: 'batchComposer.sections.draftAttachments',
  label: 'Batch composer draft attachments section',
  Component: BatchDraftAttachmentsSection,
  enabled: (context) => context.attachments.length > 0
} satisfies ElementDefinition<BatchDraftLayoutContext>;
