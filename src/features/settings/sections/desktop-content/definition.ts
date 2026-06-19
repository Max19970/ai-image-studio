import type { ElementDefinition } from '../../../../interface/registry/types';
import type { SettingsLayoutZoneContext } from '../../settingsTypes';
import { lazyElementComponent } from '../../../../interface/registry/lazyElement';

const definition: ElementDefinition<SettingsLayoutZoneContext> = {
  id: 'settingsLayout.desktopContent',
  label: 'Settings desktop content shell',
  Component: lazyElementComponent(() => import('./SettingsDesktopContentSection'), 'SettingsDesktopContentSection'),
  enabled: (context) => context.variant === 'desktop'
};

export default definition;
