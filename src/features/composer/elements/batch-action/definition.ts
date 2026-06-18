import type { ElementDefinition } from '../../../../interface/registry/types';
import type { ComposerActionContext } from '../../composerTypes';
import { BatchAction } from './BatchAction';

export default {
  id: 'composer.batchAction',
  label: 'Open batch composer',
  Component: BatchAction
} satisfies ElementDefinition<ComposerActionContext>;
