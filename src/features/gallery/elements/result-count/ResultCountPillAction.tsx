import { GalleryCountPill } from '../shared/GallerySlotElements';
import type { GalleryHeaderActionContext } from '../../../../interface/context/workspace/gallery';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';

export function ResultCountPillAction({ context }: ElementDefinitionProps<GalleryHeaderActionContext>) {
  return <GalleryCountPill archive={context.archive} busy={context.busy} />;
}
