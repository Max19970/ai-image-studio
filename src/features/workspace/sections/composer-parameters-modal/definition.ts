import type { ElementDefinition } from '../../../../interface/registry/types';
import type { WorkspaceModalsContext } from '../../../../interface/context/workspace/composerDock';
import { WorkspaceComposerParametersModalSection } from './WorkspaceComposerParametersModalSection';

export default {
  id: 'workspace.composerParametersModal',
  Component: WorkspaceComposerParametersModalSection
} satisfies ElementDefinition<WorkspaceModalsContext>;
