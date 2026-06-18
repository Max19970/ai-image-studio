import { MultiImageComposer } from '../../../batch-composer/MultiImageComposer';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { WorkspaceMainContext } from '../../../../interface/context/workspace/main';

export function WorkspaceBatchComposerSection({ context }: ElementDefinitionProps<WorkspaceMainContext>) {
  return <MultiImageComposer {...context.batchComposer} />;
}
