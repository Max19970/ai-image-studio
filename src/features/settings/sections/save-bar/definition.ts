import type { ElementDefinition } from '../../../../interface/registry/types';
import type { SettingsLayoutZoneContext } from '../../settingsTypes';
import { SettingsSaveBarSection } from './SettingsSaveBarSection';

const definition: ElementDefinition<SettingsLayoutZoneContext> = {
  id: 'settingsLayout.saveBar',
  label: 'Settings save bar',
  Component: SettingsSaveBarSection
};

export default definition;
