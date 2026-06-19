import type { ElementDefinition } from '../../../../interface/registry/types';
import type { SettingsLayoutZoneContext } from '../../settingsTypes';
import { lazyElementComponent } from '../../../../interface/registry/lazyElement';

const definition: ElementDefinition<SettingsLayoutZoneContext> = {
  id: 'settingsLayout.activeSection',
  label: 'Settings active section',
  Component: lazyElementComponent(() => import('./SettingsActiveSection'), 'SettingsActiveSection')
};

export default definition;
