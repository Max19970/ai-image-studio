import type { ElementPlacement } from '../registry/types';
import type { ComposerLayoutContext } from '../../features/composer/composerTypes';

export default [
  {
    id: 'composer.layout.attachments',
    slot: 'composer/attachments',
    use: 'composer.sections.attachments',
    order: 10
  },
  {
    id: 'composer.layout.prompt',
    slot: 'composer/input',
    use: 'composer.sections.prompt',
    order: 20
  },
  {
    id: 'composer.layout.actions',
    slot: 'composer/actions',
    use: 'composer.sections.actions',
    order: 30
  },
  {
    id: 'composer.layout.status',
    slot: 'composer/status',
    use: 'composer.sections.status',
    order: 40
  }
] satisfies ElementPlacement<ComposerLayoutContext>[];
