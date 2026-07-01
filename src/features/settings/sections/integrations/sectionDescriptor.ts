import type { SettingsSectionDescriptor } from '../sectionDescriptorTypes';

export const settingsSectionDescriptor = {
  id: 'integrations',
  tab: 'integrations',
  elementUse: 'settingsSections.integrations',
  order: 30,
  labelKey: 'settings.tab.integrations',
  hintKey: 'settings.tab.integrationsHint'
} satisfies SettingsSectionDescriptor;
