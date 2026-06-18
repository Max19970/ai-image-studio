import type { ElementDefinition } from '../../../../interface/registry/types';
import type { SidebarTabContext, WorkspaceTab } from '../../../../interface/context/workspace/tabs';
import { WorkspaceTabElement } from './WorkspaceTabElement';

type WorkspaceTabElementProps = {
  tab: WorkspaceTab;
  icon: string;
  labelKey: string;
};

export default {
  id: 'navigation.workspaceTab',
  label: 'Workspace tab',
  Component: WorkspaceTabElement
} satisfies ElementDefinition<SidebarTabContext, WorkspaceTabElementProps>;
