import type { ElementPlacement } from '../registry/types';

export default [
  {
    id: 'batchComposer.layout.header',
    slot: 'batch-composer/header',
    use: 'batchComposer.sections.header',
    order: 10
  },
  {
    id: 'batchComposer.layout.controls',
    slot: 'batch-composer/controls',
    use: 'batchComposer.sections.controls',
    order: 20
  },
  {
    id: 'batchComposer.layout.draftList',
    slot: 'batch-composer/drafts',
    use: 'batchComposer.sections.draftList',
    order: 30
  },
  {
    id: 'batchComposer.layout.footer',
    slot: 'batch-composer/footer',
    use: 'batchComposer.sections.footer',
    order: 40
  },
  {
    id: 'batchComposer.draft.card',
    slot: 'batch-composer/draft/card',
    use: 'batchComposer.sections.draftCard',
    order: 10
  },
  {
    id: 'batchComposer.draft.header',
    slot: 'batch-composer/draft/header',
    use: 'batchComposer.sections.draftHeader',
    order: 10
  },
  {
    id: 'batchComposer.draft.mode',
    slot: 'batch-composer/draft/mode',
    use: 'batchComposer.sections.draftMode',
    order: 20
  },
  {
    id: 'batchComposer.draft.prompt',
    slot: 'batch-composer/draft/prompt',
    use: 'batchComposer.sections.draftPrompt',
    order: 30
  },
  {
    id: 'batchComposer.draft.attachments',
    slot: 'batch-composer/draft/attachments',
    use: 'batchComposer.sections.draftAttachments',
    order: 40
  },
  {
    id: 'batchComposer.draft.toolbar',
    slot: 'batch-composer/draft/toolbar',
    use: 'batchComposer.sections.draftToolbar',
    order: 50
  }
] satisfies ElementPlacement[];
