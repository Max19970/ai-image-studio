import type { SettingsSectionDescriptor } from '../sectionDescriptorTypes';

export const settingsSectionDescriptor = {
  id: 'generationApi',
  tab: 'generationApi',
  elementUse: 'settingsSections.generationApi',
  order: 20,
  labelKey: 'settings.tab.generationApi',
  hintKey: 'settings.tab.generationApiHint',
  requiresFeature: 'providerProbing'
} satisfies SettingsSectionDescriptor;
