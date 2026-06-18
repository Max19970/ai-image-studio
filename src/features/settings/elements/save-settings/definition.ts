import type { ElementDefinition } from '../../../../interface/registry/types';
import type { SettingsSaveActionContext } from '../../../../interface/context/workspace/settings';
import { SaveSettingsAction } from './SaveSettingsAction';

export default {
  id: 'settings.saveChanges',
  label: 'Save settings changes',
  Component: SaveSettingsAction
} satisfies ElementDefinition<SettingsSaveActionContext>;
