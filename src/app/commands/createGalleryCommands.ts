import type { GalleryCommands } from '../../interface/context/commands';
import type { CreateAppCommandsArgs } from './appCommandTypes';
import { startGalleryHiresFixCommand } from './galleryHiresFixCommand';
import { clearTasksCommand, deleteTaskCommand } from './workspaceCommands';
import type { WorkspaceNavigationCommands } from './types';

export function createGalleryCommands(args: CreateAppCommandsArgs, navigation: WorkspaceNavigationCommands): GalleryCommands {
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
    openTaskDetail: (task, image) => {
      args.setSelectedTaskId(task.id);
      args.setSelectedImageId(image?.id ?? null);
    },
    startHiresFix: (task, image) => startGalleryHiresFixCommand(args, task, image),
    setActivePath: args.setActiveGalleryPath,
    createFolder: args.createGalleryFolder,
    deleteFolder: args.deleteGalleryFolder,
    moveItem: args.moveGalleryItem,
    pasteItems: args.pasteGalleryItems,
    setPinned: args.setGalleryItemPinned,
    setTags: args.setGalleryItemTags
  };
}
