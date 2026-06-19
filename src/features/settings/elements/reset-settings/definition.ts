import type { ElementDefinition } from '../../../../interface/registry/types';
import type { SettingsSaveActionContext } from '../../../../interface/context/workspace/settings';
import { lazyElementComponent } from '../../../../interface/registry/lazyElement';

export default {
  id: 'settings.resetChanges',
  label: 'Reset settings changes',
  Component: lazyElementComponent(() => import('./ResetSettingsAction'), 'ResetSettingsAction')
} satisfies ElementDefinition<SettingsSaveActionContext>;
