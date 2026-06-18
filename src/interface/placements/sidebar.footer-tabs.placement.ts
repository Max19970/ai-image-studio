import type { ElementPlacement } from '../registry/types';
import type { SidebarTabContext } from '../context/workspace/tabs';

export default [
  {
    id: 'sidebar.footer.settings-tab',
    slot: 'sidebar/footer-tabs',
    use: 'navigation.workspaceTab',
    order: 10,
    props: { tab: 'settings', icon: '⚙', labelKey: 'nav.settings' },
    requiresFeature: 'settings'
  }
] satisfies ElementPlacement<SidebarTabContext>[];
