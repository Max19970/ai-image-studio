import type { BatchComposerCommands, RequestPresetCommands } from '../../interface/context/commands';
import { sanitizeBatchDraftForSettings } from '../../entities/provider/compatibility';
import type { CreateAppCommandsArgs } from './appCommandTypes';
import { createBatchDraftFromWorkspace } from './commandFactoryHelpers';
import { submitBatchGenerationCommand } from './generationCommands';

export function createBatchComposerCommands(args: CreateAppCommandsArgs, requestPresets: RequestPresetCommands): BatchComposerCommands {
  const createDraft = (source = {}) => createBatchDraftFromWorkspace(args, source);

  return {
    setIntervalSeconds: args.setBatchIntervalSeconds,
    patchDraft: (id, patch) => {
      args.setBatchDrafts((prev) => prev.map((draft) => {
        if (draft.id !== id) return draft;
        return sanitizeBatchDraftForSettings({ ...draft, ...patch }, args.studioSettings).value;
      }));
    },
    patchDraftParams: (id, params) => {
      args.setBatchDrafts((prev) => prev.map((draft) => draft.id === id ? { ...draft, params } : draft));
    },
    addDraft: () => {
      args.setBatchDrafts((prev) => [
        ...prev,
        sanitizeBatchDraftForSettings(createDraft({
          params: prev[prev.length - 1]?.params ?? args.params,
          selectedModelId: prev[prev.length - 1]?.selectedModelId ?? args.studioSettings.selectedModelId,
          providerModeId: prev[prev.length - 1]?.providerModeId ?? args.providerModeId
        }), args.studioSettings).value
      ]);
    },
    duplicateDraft: (id) => {
      args.setBatchDrafts((prev) => {
        const source = prev.find((draft) => draft.id === id);
        return source ? [...prev, sanitizeBatchDraftForSettings(createDraft(source), args.studioSettings).value] : prev;
      });
    },
    removeDraft: (id) => {
      args.setBatchDrafts((prev) => prev.length > 1 ? prev.filter((draft) => draft.id !== id) : prev);
    },
    openParameters: args.setBatchParametersDraftId,
    requestPresets,
    submit: () => submitBatchGenerationCommand({
      canSubmit: args.batchCanSubmit,
      drafts: args.batchDrafts,
      intervalSeconds: args.batchIntervalSeconds,
      settings: args.studioSettings,
      selectedModelId: args.studioSettings.selectedModelId,
      capabilityReport: args.capabilityReport,
      taskHistory: args.taskHistory,
      setBusy: args.setBusy,
      setBatchComposerOpen: args.setBatchComposerOpen,
      t: args.t,
      galleryPath: args.activeGalleryPath
    }),
    close: () => args.setBatchComposerOpen(false)
  };
}
