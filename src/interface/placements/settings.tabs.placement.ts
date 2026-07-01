import { settingsSectionDescriptors } from '../../features/settings/sections/sectionRegistry';
import type { ElementPlacement } from '../registry/types';
import type { SettingsTabContext } from '../context/workspace/tabs';
import type { SettingsTab } from '../../features/settings/settingsTypes';

export default settingsSectionDescriptors.map((descriptor) => ({
  id: `settings.tabs.${descriptor.id}`,
  slot: 'settings/tabs',
  use: 'settings.tab',
  order: descriptor.order,
  props: {
    tab: descriptor.tab,
    labelKey: descriptor.labelKey,
    hintKey: descriptor.hintKey
  },
  requiresFeature: descriptor.requiresFeature
})) satisfies ElementPlacement<SettingsTabContext<SettingsTab>>[];
