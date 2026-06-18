import type { ElementDefinition } from '../../../../interface/registry/types';
import type { SettingsLayoutZoneContext } from '../../settingsTypes';
import { SettingsDesktopContentSection } from './SettingsDesktopContentSection';

const definition: ElementDefinition<SettingsLayoutZoneContext> = {
  id: 'settingsLayout.desktopContent',
  label: 'Settings desktop content shell',
  Component: SettingsDesktopContentSection,
  enabled: (context) => context.variant === 'desktop'
};

export default definition;
