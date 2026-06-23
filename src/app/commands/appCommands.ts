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

export function createAppCommands(args: CreateAppCommandsArgs): AppCommands {
  const requestPresets = createRequestPresetCommands(args.requestPresets);

  return {
    workspace: createWorkspaceCommands(args.workspace),
    composer: createComposerCommands(args.composer, requestPresets),
    gallery: createGalleryCommands(args.gallery),
    batchComposer: createBatchComposerCommands(args.batchComposer, requestPresets),
    settings: createSettingsCommands(args.settings),
    detail: createDetailCommands(args.detail),
    parameters: createParameterCommands(args.parameters)
  };
}
