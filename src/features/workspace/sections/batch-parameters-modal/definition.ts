import type { ElementDefinition } from '../../../../interface/registry/types';
import type { WorkspaceModalsContext } from '../../../../interface/context/workspace/composerDock';
import { WorkspaceBatchParametersModalSection } from './WorkspaceBatchParametersModalSection';

export default {
  id: 'workspace.batchParametersModal',
  label: 'Workspace batch request parameters modal',
  Component: WorkspaceBatchParametersModalSection,
  enabled: (context) => Boolean(context.batchParameters.draft)
} satisfies ElementDefinition<WorkspaceModalsContext>;
