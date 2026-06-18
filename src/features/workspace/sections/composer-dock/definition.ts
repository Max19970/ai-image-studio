import type { ElementDefinition } from '../../../../interface/registry/types';
import type { WorkspaceComposerDockContext } from '../../../../interface/context/workspace/composerDock';
import { WorkspaceComposerDockSection } from './WorkspaceComposerDockSection';

export default {
  id: 'workspace.composerDock',
  label: 'Workspace composer dock',
  Component: WorkspaceComposerDockSection
} satisfies ElementDefinition<WorkspaceComposerDockContext>;
