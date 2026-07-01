import type { GalleryCommands } from '../../interface/context/commands';
import type { GalleryCommandDeps } from './appCommandTypes';
import { cancelServerGenerationTask } from '../../processes/server-generation-actions';
import { startGalleryHiresFixCommand } from './galleryHiresFixCommand';
import { clearTasksCommand, deleteTaskCommand } from './workspaceCommands';

export function createGalleryCommands(args: GalleryCommandDeps): GalleryCommands {
  const { navigation } = args;

  return {
    activePath: args.activeGalleryPath,
    galleryFolders: args.galleryFolders,
    galleryPins: args.galleryPins,
    galleryTagRecords: args.galleryTagRecords,
    clearResults: () => clearTasksCommand({ navigation, taskHistory: args.taskHistory }),
    deleteTask: (taskId) => deleteTaskCommand({
      taskId,
      selectedTaskId: args.selectedTaskId,
      navigation,
      taskHistory: args.taskHistory
    }),
    cancelTask: (taskId) => cancelServerGenerationTask(taskId),
    openTaskDetail: (task, image) => {
      args.setSelectedTaskId(task.id);
      args.setSelectedImageId(image?.id ?? null);
    },
    startHiresFix: (task, image) => startGalleryHiresFixCommand(args.hiresFix, task, image),
    setActivePath: args.setActiveGalleryPath,
    createFolder: args.createGalleryFolder,
    deleteFolder: args.deleteGalleryFolder,
    moveItem: args.moveGalleryItem,
    pasteItems: args.pasteGalleryItems,
    setPinned: args.setGalleryItemPinned,
    setTags: args.setGalleryItemTags
  };
}
