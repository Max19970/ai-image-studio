import type { SettingsSectionDescriptor } from '../sectionDescriptorTypes';

export const settingsSectionDescriptor = {
  id: 'interface',
  tab: 'interface',
  elementUse: 'settingsSections.interface',
  order: 10,
  labelKey: 'settings.tab.interface',
  hintKey: 'settings.tab.interfaceHint'
} satisfies SettingsSectionDescriptor;
