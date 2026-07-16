import type { WorkspaceGalleryContext } from './gallery';
import type { WorkspaceInfoContext } from './info';
import type { WorkspaceSettingsContext } from './settings';
import type { WorkspaceTab } from './tabs';

export interface WorkspaceMainContext {
  activeTab: WorkspaceTab;
  gallery: WorkspaceGalleryContext;
  info: WorkspaceInfoContext;
  settings: WorkspaceSettingsContext;
}
