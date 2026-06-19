import type { ElementDefinition } from '../../../../interface/registry/types';
import type { SettingsLayoutZoneContext } from '../../settingsTypes';
import { lazyElementComponent } from '../../../../interface/registry/lazyElement';

const definition: ElementDefinition<SettingsLayoutZoneContext> = {
  id: 'settingsLayout.tabNavigation',
  label: 'Settings tab navigation',
  Component: lazyElementComponent(() => import('./SettingsTabNavigationSection'), 'SettingsTabNavigationSection')
};

export default definition;
