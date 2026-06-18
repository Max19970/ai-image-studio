import type { ElementDefinition } from '../../../../interface/registry/types';
import type { SettingsLayoutZoneContext } from '../../settingsTypes';
import { SettingsPageHeadingSection } from './SettingsPageHeadingSection';

const definition: ElementDefinition<SettingsLayoutZoneContext> = {
  id: 'settingsLayout.header',
  label: 'Settings page heading',
  Component: SettingsPageHeadingSection
};

export default definition;
