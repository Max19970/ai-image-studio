import type { ElementDefinition } from '../../../../interface/registry/types';
import type { SettingsLayoutContext } from '../../settingsTypes';
import { SettingsLayoutRootSection } from './SettingsLayoutRootSection';

const definition: ElementDefinition<SettingsLayoutContext> = {
  id: 'settingsLayout.root',
  label: 'Settings layout root',
  Component: SettingsLayoutRootSection
};

export default definition;
