import type { ElementDefinition } from '../../../../interface/registry/types';
import type { WorkspaceMainContext } from '../../../../interface/context/workspace/main';
import { WorkspaceInfoSection } from './WorkspaceInfoSection';

export default {
  id: 'workspace.infoPage',
  label: 'Workspace info page',
  Component: WorkspaceInfoSection
} satisfies ElementDefinition<WorkspaceMainContext>;
