export type WorkspaceTab = 'images' | 'info' | 'settings';
export type SidebarSlotVariant = 'expanded' | 'collapsed' | 'mobile';
export type SettingsSlotVariant = 'desktop' | 'mobile';

export interface SidebarTabContext {
  activeTab: WorkspaceTab;
  variant: SidebarSlotVariant;
  onTabChange: (tab: WorkspaceTab) => void;
  onAfterSelect?: () => void;
}

export interface SettingsTabContext<TTab extends string = string> {
  activeTab: TTab;
  variant: SettingsSlotVariant;
  onTabChange: (tab: TTab) => void;
}
