import type { ElementPlacement } from '../registry/types';
import type { ComposerActionContext } from '../../features/composer/composerTypes';

export default [
  {
    id: 'composer.tools.controls',
    slot: 'composer/tools',
    use: 'composer.controlsAction',
    order: 10
  }
] satisfies ElementPlacement<ComposerActionContext>[];
