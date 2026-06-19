import type { ElementDefinition } from '../../../../interface/registry/types';
import type { BatchDraftLayoutContext } from '../../batchComposerTypes';
import { lazyElementComponent } from '../../../../interface/registry/lazyElement';

export default {
  id: 'batchComposer.sections.draftAttachments',
  label: 'Batch composer draft attachments section',
  Component: lazyElementComponent(() => import('./BatchDraftAttachmentsSection'), 'BatchDraftAttachmentsSection'),
  enabled: (context) => context.attachments.length > 0
} satisfies ElementDefinition<BatchDraftLayoutContext>;
