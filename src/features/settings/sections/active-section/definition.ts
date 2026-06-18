import type { ElementDefinition } from '../../../../interface/registry/types';
import type { SettingsLayoutZoneContext } from '../../settingsTypes';
import { SettingsActiveSection } from './SettingsActiveSection';

const definition: ElementDefinition<SettingsLayoutZoneContext> = {
  id: 'settingsLayout.activeSection',
  label: 'Settings active section',
  Component: SettingsActiveSection
};

export default definition;
