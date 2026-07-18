import type { DetailCommands } from '../../interface/context/commands';
import type { DetailCommandDeps } from './appCommandTypes';
import { cancelServerGenerationTask } from '../../processes/server-generation-actions';
import { restoreRequestToWorkspaceCommand } from './workspaceCommands';
import { startGalleryHiresFixCommand } from './galleryHiresFixCommand';

export function createDetailCommands(args: DetailCommandDeps): DetailCommands {
  return {
    backToGallery: () => {
      args.setSelectedTaskId(null);
      args.setSelectedImageId(null);
    },
    selectImage: (image) => args.setSelectedImageId(image.id),
    startHiresFix: (task, image) => startGalleryHiresFixCommand(args.hiresFix, task, image),
    cancelTask: (taskId) => cancelServerGenerationTask(taskId),
    restoreRequest: (snapshot) => restoreRequestToWorkspaceCommand(snapshot, {
      t: args.t,
      params: args.params,
      settings: args.studioSettings,
      replaceActiveComposerRequest: args.replaceActiveComposerRequest,
      setSelectedTaskId: args.setSelectedTaskId,
      setSelectedImageId: args.setSelectedImageId
    })
  };
}
