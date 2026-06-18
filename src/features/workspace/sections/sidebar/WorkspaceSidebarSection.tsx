import { StudioSidebar } from '../../StudioSidebar';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { WorkspaceSidebarContext } from '../../../../interface/context/workspace/sidebar';

export function WorkspaceSidebarSection({ context }: ElementDefinitionProps<WorkspaceSidebarContext>) {
  return (
    <StudioSidebar
      collapsed={context.collapsed}
      activeTab={context.activeTab}
      onTabChange={context.commands.setTab}
      onCollapseChange={context.commands.setSidebarCollapsed}
    />
  );
}
