import type { ElementDefinition } from '../../../../interface/registry/types';
import type { SettingsLayoutContext } from '../../settingsTypes';
import { lazyElementComponent } from '../../../../interface/registry/lazyElement';

const definition: ElementDefinition<SettingsLayoutContext> = {
  id: 'settingsLayout.root',
  label: 'Settings layout root',
  Component: lazyElementComponent(() => import('./SettingsLayoutRootSection'), 'SettingsLayoutRootSection')
};

export default definition;
