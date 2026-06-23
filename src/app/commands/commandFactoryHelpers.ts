import type { BatchComposerDraft } from '../../domain/generationTask';
import type { BatchComposerCommandDeps, GalleryCommandDeps } from './appCommandTypes';
import { makeBatchDraft } from './workspaceCommands';
import type { WorkspaceNavigationCommands } from './types';

export function createWorkspaceNavigationBinding(args: GalleryCommandDeps): WorkspaceNavigationCommands {
  return {
    setSelectedTaskId: args.setSelectedTaskId,
    setSelectedImageId: args.setSelectedImageId,
    setBatchComposerOpen: args.hiresFix.setBatchComposerOpen
  };
}

export function createBatchDraftFromWorkspace(args: BatchComposerCommandDeps, source?: Partial<BatchComposerDraft>): BatchComposerDraft {
  return makeBatchDraft({
    source,
    fallbackParams: args.params,
    fallbackSelectedModelId: args.studioSettings.selectedModelId,
    fallbackProviderModeId: args.providerModeId
  });
}
