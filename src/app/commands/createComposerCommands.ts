import type { ImageParams } from '../../domain/imageParams';
import type { ComposerCommands, RequestPresetCommands } from '../../interface/context/commands';
import {
  setComposerImageAttachments,
  setComposerMask,
  setComposerReferenceImages,
  setComposerTargetImage
} from './composerAttachmentCommands';
import {
  applyComposerCompatibilityForModel,
  setComposerProviderModeWithCompatibility
} from './providerCompatibilityCommands';
import type { ComposerCommandDeps } from './appCommandTypes';
import { submitComposerDraftsCommand } from './generationCommands';

export function createComposerCommands(
  args: ComposerCommandDeps,
  requestPresets: RequestPresetCommands
): ComposerCommands {
  const patchParams = (patch: Partial<ImageParams>) => args.setParams((previous) => ({ ...previous, ...patch }));

  return {
    setProviderMode: (providerModeId) => setComposerProviderModeWithCompatibility(args, providerModeId),
    setModel: (modelId) => {
      const nextSettings = args.normalizeSettings({ ...args.studioSettings, selectedModelId: modelId });
      args.setStudioSettings(nextSettings);
      applyComposerCompatibilityForModel(args, nextSettings, modelId);
    },
    setPrompt: (prompt) => patchParams({ prompt }),
    patchParams: args.setParams,
    submit: async () => {
      const submittedIds = await submitComposerDraftsCommand({
        drafts: args.composerDrafts,
        intervalSeconds: args.composerIntervalSeconds,
        settings: args.studioSettings,
        selectedModelId: args.studioSettings.selectedModelId,
        capabilityReport: args.capabilityReport,
        setBusy: args.setBusy,
        setServerSubmission: args.setServerSubmission,
        taskHistory: args.taskHistory,
        t: args.t,
        galleryPath: args.activeGalleryPath
      });
      if (submittedIds.length === 0) return;
      const submitted = new Set(submittedIds);
      args.setComposerDrafts((drafts) => drafts.filter((draft) => !submitted.has(draft.id)));
    },
    openParameters: () => args.setComposerParametersDraftId(args.activeComposerDraftId),
    selectDraft: args.selectComposerDraft,
    addDraft: args.addComposerDraft,
    duplicateDraft: args.duplicateComposerDraft,
    removeDraft: args.removeComposerDraft,
    patchDraft: args.patchComposerDraft,
    patchDraftParams: args.patchComposerDraftParams,
    setIntervalSeconds: args.setComposerIntervalSeconds,
    setTargetImage: (file) => setComposerTargetImage(args, file),
    setReferenceImages: (files) => setComposerReferenceImages(args, files),
    setImageAttachments: (targetImage, referenceImages) => setComposerImageAttachments(args, targetImage, referenceImages),
    setMask: (file) => setComposerMask(args, file),
    requestPresets
  };
}
