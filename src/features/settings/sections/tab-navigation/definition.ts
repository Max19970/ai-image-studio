import type { ElementDefinition } from '../../../../interface/registry/types';
import type { SettingsLayoutZoneContext } from '../../settingsTypes';
import { SettingsTabNavigationSection } from './SettingsTabNavigationSection';

const definition: ElementDefinition<SettingsLayoutZoneContext> = {
  id: 'settingsLayout.tabNavigation',
  label: 'Settings tab navigation',
  Component: SettingsTabNavigationSection
};

export default definition;
