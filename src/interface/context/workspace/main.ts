import type { WorkspaceBatchComposerContext } from './batchComposer';
import type { WorkspaceGalleryContext } from './gallery';
import type { WorkspaceInfoContext } from './info';
import type { WorkspaceSettingsContext } from './settings';
import type { WorkspaceTab } from './tabs';

export interface WorkspaceMainContext {
  activeTab: WorkspaceTab;
  batchComposerOpen: boolean;
  gallery: WorkspaceGalleryContext;
  batchComposer: WorkspaceBatchComposerContext;
  info: WorkspaceInfoContext;
  settings: WorkspaceSettingsContext;
}
