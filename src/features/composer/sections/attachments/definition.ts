import type { ElementDefinition } from '../../../../interface/registry/types';
import type { ComposerLayoutContext } from '../../composerTypes';
import { ComposerAttachmentsSection } from './ComposerAttachmentsSection';

export default {
  id: 'composer.sections.attachments',
  label: 'Composer attachment strip section',
  Component: ComposerAttachmentsSection,
  enabled: (context) => context.attachments.length > 0
} satisfies ElementDefinition<ComposerLayoutContext>;
