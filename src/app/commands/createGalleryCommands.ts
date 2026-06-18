import type { GalleryCommands } from '../../interface/context/commands';
import type { CreateAppCommandsArgs } from './appCommandTypes';
import { clearTasksCommand, deleteTaskCommand } from './workspaceCommands';
import type { WorkspaceNavigationCommands } from './types';

export function createGalleryCommands(args: CreateAppCommandsArgs, navigation: WorkspaceNavigationCommands): GalleryCommands {
  return {
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
    }
  };
}
