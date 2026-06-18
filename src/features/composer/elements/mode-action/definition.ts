import type { ElementDefinition } from '../../../../interface/registry/types';
import type { ComposerActionContext } from '../../composerTypes';
import { ModeAction } from './ModeAction';

export default {
  id: 'composer.modeAction',
  label: 'Composer mode switch',
  Component: ModeAction
} satisfies ElementDefinition<ComposerActionContext>;
