import type { ElementDefinition } from '../../../../interface/registry/types';
import type { ComposerActionContext } from '../../../composer/composerTypes';
import { RequestPresetMenuAction } from './RequestPresetMenuAction';

export default {
  id: 'requestPresets.menuAction',
  label: 'Request presets menu action',
  Component: RequestPresetMenuAction
} satisfies ElementDefinition<ComposerActionContext>;
