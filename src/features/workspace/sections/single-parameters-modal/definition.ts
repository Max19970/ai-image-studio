import type { ElementDefinition } from '../../../../interface/registry/types';
import type { WorkspaceModalsContext } from '../../../../interface/context/workspace/composerDock';
import { WorkspaceSingleParametersModalSection } from './WorkspaceSingleParametersModalSection';

export default {
  id: 'workspace.singleParametersModal',
  label: 'Workspace single request parameters modal',
  Component: WorkspaceSingleParametersModalSection
} satisfies ElementDefinition<WorkspaceModalsContext>;
