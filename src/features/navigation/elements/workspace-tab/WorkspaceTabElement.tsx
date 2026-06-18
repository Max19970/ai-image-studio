import { WorkspaceTabButton } from '../../../../interface/primitives/WorkspaceTabButton';
import type { SidebarTabContext, WorkspaceTab } from '../../../../interface/context/workspace/tabs';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';

type WorkspaceTabElementProps = {
  tab: WorkspaceTab;
  icon: string;
  labelKey: string;
};

export function WorkspaceTabElement({ context, props }: ElementDefinitionProps<SidebarTabContext, WorkspaceTabElementProps>) {
  return <WorkspaceTabButton context={context} tab={props.tab} icon={props.icon} labelKey={props.labelKey} />;
}
