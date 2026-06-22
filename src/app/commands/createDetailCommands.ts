import type { DetailCommands } from '../../interface/context/commands';
import type { CreateAppCommandsArgs } from './appCommandTypes';
import { restoreRequestToWorkspaceCommand } from './workspaceCommands';
import { startGalleryHiresFixCommand } from './galleryHiresFixCommand';

export function createDetailCommands(args: CreateAppCommandsArgs): DetailCommands {
  return {
    backToGallery: () => {
      args.setSelectedTaskId(null);
      args.setSelectedImageId(null);
    },
    selectImage: (image) => args.setSelectedImageId(image.id),
    startHiresFix: (task, image) => startGalleryHiresFixCommand(args, task, image),
    restoreRequest: (snapshot) => restoreRequestToWorkspaceCommand(snapshot, {
      t: args.t,
      setProviderModeId: args.setProviderModeId,
      setCompatibilityNotice: args.setCompatibilityNotice,
      setBatchComposerOpen: args.setBatchComposerOpen,
      setParams: args.setParams,
      settings: args.studioSettings,
      setSettings: args.setStudioSettings,
      setSelectedTaskId: args.setSelectedTaskId,
      setSelectedImageId: args.setSelectedImageId
    })
  };
}
