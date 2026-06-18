import { ImageComposer } from '../../../composer/ImageComposer';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { WorkspaceComposerDockContext } from '../../../../interface/context/workspace/composerDock';

export function WorkspaceComposerDockSection({ context }: ElementDefinitionProps<WorkspaceComposerDockContext>) {
  return <ImageComposer {...context} />;
}
