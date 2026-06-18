import type { ElementPlacement } from '../registry/types';
import type { ComposerActionContext } from '../../features/composer/composerTypes';

export default [
  {
    id: 'composer.tools.mode',
    slot: 'composer/tools',
    use: 'composer.modeAction',
    order: 10
  },
  {
    id: 'composer.tools.assets',
    slot: 'composer/tools',
    use: 'composer.assetsAction',
    order: 20
  },
  {
    id: 'composer.tools.batch',
    slot: 'composer/tools',
    use: 'composer.batchAction',
    order: 30,
    requiresFeature: 'batchComposer'
  },
  {
    id: 'composer.tools.parameters',
    slot: 'composer/tools',
    use: 'composer.parametersAction',
    order: 40
  }
] satisfies ElementPlacement<ComposerActionContext>[];
