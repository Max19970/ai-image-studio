import type { ElementDefinition } from '../../../../interface/registry/types';
import type { ComposerLayoutContext } from '../../composerTypes';
import { ComposerStatusSection } from './ComposerStatusSection';

export default {
  id: 'composer.sections.status',
  label: 'Composer status notes section',
  Component: ComposerStatusSection,
  enabled: (context) => Boolean(context.statusText) || (context.mode === 'edit' && !context.hasImageAttachments)
} satisfies ElementDefinition<ComposerLayoutContext>;
