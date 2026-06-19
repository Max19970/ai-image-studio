import type { ElementDefinition } from '../../../../interface/registry/types';
import type { SettingsSaveActionContext } from '../../../../interface/context/workspace/settings';
import { lazyElementComponent } from '../../../../interface/registry/lazyElement';

export default {
  id: 'settings.saveChanges',
  label: 'Save settings changes',
  Component: lazyElementComponent(() => import('./SaveSettingsAction'), 'SaveSettingsAction')
} satisfies ElementDefinition<SettingsSaveActionContext>;
