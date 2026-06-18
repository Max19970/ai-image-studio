import type { BatchComposerDraft } from '../../domain/generationTask';
import type { CreateAppCommandsArgs } from './appCommandTypes';
import { makeBatchDraft } from './workspaceCommands';
import type { WorkspaceNavigationCommands } from './types';

export function createWorkspaceNavigationBinding(args: CreateAppCommandsArgs): WorkspaceNavigationCommands {
  return {
    setSelectedTaskId: args.setSelectedTaskId,
    setSelectedImageId: args.setSelectedImageId,
    setBatchComposerOpen: args.setBatchComposerOpen
  };
}

export function createBatchDraftFromWorkspace(args: CreateAppCommandsArgs, source?: Partial<BatchComposerDraft>): BatchComposerDraft {
  return makeBatchDraft({
    source,
    fallbackParams: args.params,
    fallbackSelectedModelId: args.studioSettings.selectedModelId
  });
}
