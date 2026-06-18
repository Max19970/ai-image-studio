import { StudioInfoPage } from '../../StudioInfoPage';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { WorkspaceMainContext } from '../../../../interface/context/workspace/main';

export function WorkspaceInfoSection({ context }: ElementDefinitionProps<WorkspaceMainContext>) {
  return <StudioInfoPage {...context.info} />;
}
