import { useState } from 'react';
import type { WorkspaceTab } from '../../../interface/context/workspace/tabs';
import type { StateSetter } from '../types';

export interface NavigationWorkspaceState {
  parametersOpen: boolean;
  setParametersOpen: StateSetter<boolean>;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: StateSetter<boolean>;
  workspaceTab: WorkspaceTab;
  setWorkspaceTab: StateSetter<WorkspaceTab>;
}

export function useNavigationWorkspaceState(): NavigationWorkspaceState {
  const [parametersOpen, setParametersOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('images');

  return {
    parametersOpen,
    setParametersOpen,
    sidebarCollapsed,
    setSidebarCollapsed,
    workspaceTab,
    setWorkspaceTab
  };
}
