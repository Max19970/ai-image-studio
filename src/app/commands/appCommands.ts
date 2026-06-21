import type { AppCommands } from '../../interface/context/commands';
import type { CreateAppCommandsArgs } from './appCommandTypes';
import { createBatchComposerCommands } from './createBatchComposerCommands';
import { createComposerCommands } from './createComposerCommands';
import { createDetailCommands } from './createDetailCommands';
import { createGalleryCommands } from './createGalleryCommands';
import { createParameterCommands } from './createParameterCommands';
import { createRequestPresetCommands } from './createRequestPresetCommands';
import { createSettingsCommands } from './createSettingsCommands';
import { createWorkspaceCommands } from './createWorkspaceCommands';
import { createWorkspaceNavigationBinding } from './commandFactoryHelpers';

export function createAppCommands(args: CreateAppCommandsArgs): AppCommands {
  const navigation = createWorkspaceNavigationBinding(args);
  const requestPresets = createRequestPresetCommands(args);

  return {
    workspace: createWorkspaceCommands(args),
    composer: createComposerCommands(args, requestPresets),
    gallery: createGalleryCommands(args, navigation),
    batchComposer: createBatchComposerCommands(args, requestPresets),
    settings: createSettingsCommands(args),
    detail: createDetailCommands(args),
    parameters: createParameterCommands(args)
  };
}
