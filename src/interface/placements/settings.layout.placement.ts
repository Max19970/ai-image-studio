import type { ElementPlacement } from '../registry/types';
import type { SettingsLayoutContext, SettingsLayoutZoneContext } from '../../features/settings/settingsTypes';

export default [
  {
    id: 'settings.layout.root',
    slot: 'settings/layout',
    use: 'settingsLayout.root',
    order: 10
  } satisfies ElementPlacement<SettingsLayoutContext>,
  {
    id: 'settings.layout.header',
    slot: 'settings/header',
    use: 'settingsLayout.header',
    order: 10
  } satisfies ElementPlacement<SettingsLayoutZoneContext>,
  {
    id: 'settings.layout.save-bar',
    slot: 'settings/save-bar',
    use: 'settingsLayout.saveBar',
    order: 10
  } satisfies ElementPlacement<SettingsLayoutZoneContext>,
  {
    id: 'settings.layout.tab-navigation',
    slot: 'settings/tab-navigation',
    use: 'settingsLayout.tabNavigation',
    order: 10
  } satisfies ElementPlacement<SettingsLayoutZoneContext>,
  {
    id: 'settings.layout.active-section',
    slot: 'settings/active-section',
    use: 'settingsLayout.activeSection',
    order: 10
  } satisfies ElementPlacement<SettingsLayoutZoneContext>,
  {
    id: 'settings.layout.desktop-content',
    slot: 'settings/content',
    use: 'settingsLayout.desktopContent',
    order: 10,
    enabled: (context) => context.variant === 'desktop'
  } satisfies ElementPlacement<SettingsLayoutZoneContext>
];
