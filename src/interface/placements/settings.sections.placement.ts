import type { ElementPlacement } from '../registry/types';
import type { SettingsSectionContext } from '../../features/settings/settingsTypes';

export const placements: ElementPlacement<SettingsSectionContext>[] = [
  {
    id: 'settings.sections.interface.desktop',
    slot: 'settings/sections',
    use: 'settingsSections.interface',
    order: 10,
    props: { variant: 'desktop' },
    enabled: (context) => context.activeTab === 'interface' && context.variant === 'desktop'
  },
  {
    id: 'settings.sections.interface.mobile',
    slot: 'settings/sections',
    use: 'settingsSections.interface',
    order: 10,
    props: { variant: 'mobile' },
    enabled: (context) => context.activeTab === 'interface' && context.variant === 'mobile'
  },
  {
    id: 'settings.sections.generation-api.desktop',
    slot: 'settings/sections',
    use: 'settingsSections.generationApi',
    order: 20,
    props: { variant: 'desktop' },
    enabled: (context) => context.activeTab === 'generationApi' && context.variant === 'desktop'
  },
  {
    id: 'settings.sections.generation-api.mobile',
    slot: 'settings/sections',
    use: 'settingsSections.generationApi',
    order: 20,
    props: { variant: 'mobile' },
    enabled: (context) => context.activeTab === 'generationApi' && context.variant === 'mobile'
  }
];
