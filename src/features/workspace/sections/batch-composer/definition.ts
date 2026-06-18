import type { ElementDefinition } from '../../../../interface/registry/types';
import type { WorkspaceMainContext } from '../../../../interface/context/workspace/main';
import { WorkspaceBatchComposerSection } from './WorkspaceBatchComposerSection';

export default {
  id: 'workspace.batchComposerPage',
  label: 'Workspace batch composer page',
  Component: WorkspaceBatchComposerSection
} satisfies ElementDefinition<WorkspaceMainContext>;
