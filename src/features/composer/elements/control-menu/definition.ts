import type { ElementDefinition } from '../../../../interface/registry/types';
import type { ComposerActionContext } from '../../composerTypes';
import { ComposerControlMenuAction } from './ComposerControlMenuAction';

export default {
  id: 'composer.controlsAction',
  label: 'Composer consolidated controls menu',
  Component: ComposerControlMenuAction
} satisfies ElementDefinition<ComposerActionContext>;
