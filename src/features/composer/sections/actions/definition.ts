import type { ElementDefinition } from '../../../../interface/registry/types';
import type { ComposerLayoutContext } from '../../composerTypes';
import { ComposerActionsSection } from './ComposerActionsSection';

export default {
  id: 'composer.sections.actions',
  label: 'Composer model/tools/submit actions section',
  Component: ComposerActionsSection
} satisfies ElementDefinition<ComposerLayoutContext>;
