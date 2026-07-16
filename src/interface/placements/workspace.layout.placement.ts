import type { ElementPlacement } from '../registry/types';
import type { WorkspaceComposerDockContext, WorkspaceModalsContext } from '../context/workspace/composerDock';
import type { WorkspaceMainContext } from '../context/workspace/main';
import type { WorkspaceSidebarContext } from '../context/workspace/sidebar';

export default [
  {
    id: 'workspace.sidebar.default',
    slot: 'workspace/sidebar',
    use: 'workspace.sidebar',
    order: 10
  } satisfies ElementPlacement<WorkspaceSidebarContext>,
  {
    id: 'workspace.main.gallery',
    slot: 'workspace/main',
    use: 'workspace.galleryPage',
    order: 10,
    enabled: (context) => context.activeTab === 'images'
  } satisfies ElementPlacement<WorkspaceMainContext>,
  {
    id: 'workspace.main.info',
    slot: 'workspace/main',
    use: 'workspace.infoPage',
    order: 30,
    enabled: (context) => context.activeTab === 'info',
    requiresFeature: 'studioInfo'
  } satisfies ElementPlacement<WorkspaceMainContext>,
  {
    id: 'workspace.main.settings',
    slot: 'workspace/main',
    use: 'workspace.settingsPage',
    order: 40,
    enabled: (context) => context.activeTab === 'settings',
    requiresFeature: 'settings'
  } satisfies ElementPlacement<WorkspaceMainContext>,
  {
    id: 'workspace.dock.composer',
    slot: 'workspace/dock',
    use: 'workspace.composerDock',
    order: 10,
    enabled: (context) => context.activeTab === 'images'
  } satisfies ElementPlacement<WorkspaceComposerDockContext>,
  {
    id: 'workspace.modals.composer-parameters',
    slot: 'workspace/modals',
    use: 'workspace.composerParametersModal',
    order: 10,
    enabled: (context) => Boolean(context.composerParameters.draft)
  } satisfies ElementPlacement<WorkspaceModalsContext>
];
