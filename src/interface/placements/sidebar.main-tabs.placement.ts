import type { ElementPlacement } from '../registry/types';
import type { SidebarTabContext } from '../context/workspace/tabs';

export default [
  {
    id: 'sidebar.main.images-tab',
    slot: 'sidebar/main-tabs',
    use: 'navigation.workspaceTab',
    order: 10,
    props: { tab: 'images', labelKey: 'nav.images' }
  },
  {
    id: 'sidebar.main.info-tab',
    slot: 'sidebar/main-tabs',
    use: 'navigation.workspaceTab',
    order: 20,
    props: { tab: 'info', labelKey: 'nav.info' },
    requiresFeature: 'studioInfo'
  }
] satisfies ElementPlacement<SidebarTabContext>[];
