import { ResultsGallery } from '../../../gallery/ResultsGallery';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { WorkspaceMainContext } from '../../../../interface/context/workspace/main';

export function WorkspaceGallerySection({ context }: ElementDefinitionProps<WorkspaceMainContext>) {
  return <ResultsGallery {...context.gallery} />;
}
