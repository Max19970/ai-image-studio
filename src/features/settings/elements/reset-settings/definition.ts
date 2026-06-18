import type { ElementDefinition } from '../../../../interface/registry/types';
import type { SettingsSaveActionContext } from '../../../../interface/context/workspace/settings';
import { ResetSettingsAction } from './ResetSettingsAction';

export default {
  id: 'settings.resetChanges',
  label: 'Reset settings changes',
  Component: ResetSettingsAction
} satisfies ElementDefinition<SettingsSaveActionContext>;
