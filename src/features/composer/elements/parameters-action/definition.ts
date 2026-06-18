import type { ElementDefinition } from '../../../../interface/registry/types';
import type { ComposerActionContext } from '../../composerTypes';
import { ParametersAction } from './ParametersAction';

export default {
  id: 'composer.parametersAction',
  label: 'Open generation parameters',
  Component: ParametersAction
} satisfies ElementDefinition<ComposerActionContext>;
