import type { ElementDefinition } from '../../../../interface/registry/types';
import type { ComposerActionContext } from '../../composerTypes';
import { AssetsAction } from './AssetsAction';

export default {
  id: 'composer.assetsAction',
  label: 'Composer assets picker',
  Component: AssetsAction
} satisfies ElementDefinition<ComposerActionContext>;
