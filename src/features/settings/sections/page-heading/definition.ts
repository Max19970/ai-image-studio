import type { ElementDefinition } from '../../../../interface/registry/types';
import type { SettingsLayoutZoneContext } from '../../settingsTypes';
import { lazyElementComponent } from '../../../../interface/registry/lazyElement';

const definition: ElementDefinition<SettingsLayoutZoneContext> = {
  id: 'settingsLayout.header',
  label: 'Settings page heading',
  Component: lazyElementComponent(() => import('./SettingsPageHeadingSection'), 'SettingsPageHeadingSection')
};

export default definition;
