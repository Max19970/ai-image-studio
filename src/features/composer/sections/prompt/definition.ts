import type { ElementDefinition } from '../../../../interface/registry/types';
import type { ComposerLayoutContext } from '../../composerTypes';
import { ComposerPromptSection } from './ComposerPromptSection';

export default {
  id: 'composer.sections.prompt',
  label: 'Composer prompt input section',
  Component: ComposerPromptSection
} satisfies ElementDefinition<ComposerLayoutContext>;
