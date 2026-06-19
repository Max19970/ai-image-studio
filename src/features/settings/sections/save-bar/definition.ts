import type { ElementDefinition } from '../../../../interface/registry/types';
import type { SettingsLayoutZoneContext } from '../../settingsTypes';
import { lazyElementComponent } from '../../../../interface/registry/lazyElement';

const definition: ElementDefinition<SettingsLayoutZoneContext> = {
  id: 'settingsLayout.saveBar',
  label: 'Settings save bar',
  Component: lazyElementComponent(() => import('./SettingsSaveBarSection'), 'SettingsSaveBarSection')
};

export default definition;
