import type { ImageParams } from '../../domain/imageParams';
import type { ComposerCommands, RequestPresetCommands } from '../../interface/context/commands';
import { setComposerImageAttachments, setComposerMask, setComposerReferenceImages, setComposerTargetImage } from './composerAttachmentCommands';
import { applyComposerCompatibilityForModel, setComposerProviderModeWithCompatibility } from './providerCompatibilityCommands';
import type { ComposerCommandDeps } from './appCommandTypes';
import { submitSingleGenerationCommand } from './generationCommands';
import { addCurrentRequestToBatchComposerCommand, openBatchComposerCommand } from './workspaceCommands';

export function createComposerCommands(args: ComposerCommandDeps, requestPresets: RequestPresetCommands): ComposerCommands {
  const patchParams = (patch: Partial<ImageParams>) => args.setParams((prev) => ({ ...prev, ...patch }));

  return {
    setProviderMode: (providerModeId) => setComposerProviderModeWithCompatibility(args, providerModeId),
    setModel: (modelId) => {
      const nextSettings = args.normalizeSettings({ ...args.studioSettings, selectedModelId: modelId });
      args.setStudioSettings(nextSettings);
      applyComposerCompatibilityForModel(args, nextSettings, modelId);
    },
    setPrompt: (prompt) => patchParams({ prompt }),
    patchParams: args.setParams,
    submit: () => submitSingleGenerationCommand({
      canSubmit: args.canSubmit,
      mode: args.mode,
      providerMode: args.providerMode,
      params: args.params,
      provider: args.provider,
      activeProvider: args.activeProvider,
      activeModel: args.activeModel,
      payload: args.payload,
      warnings: args.warnings,
      targetImage: args.targetImage,
      referenceImages: args.referenceImages,
      mask: args.mask,
      taskHistory: args.taskHistory,
      setBusy: args.setBusy,
      setServerSubmission: args.setServerSubmission,
      t: args.t,
      galleryPath: args.activeGalleryPath
    }),
    openParameters: () => args.setParametersOpen(true),
    openBatchComposer: () => openBatchComposerCommand({
      providerModeId: args.providerModeId,
      params: args.params,
      selectedModelId: args.studioSettings.selectedModelId,
      targetImage: args.targetImage,
      referenceImages: args.referenceImages,
      mask: args.mask,
      setDrafts: args.setBatchDrafts,
      setOpen: args.setBatchComposerOpen,
      setWorkspaceTab: args.setWorkspaceTab
    }),
    addCurrentToBatchComposer: () => addCurrentRequestToBatchComposerCommand({
      providerModeId: args.providerModeId,
      params: args.params,
      selectedModelId: args.studioSettings.selectedModelId,
      targetImage: args.targetImage,
      referenceImages: args.referenceImages,
      mask: args.mask,
      setDrafts: args.setBatchDrafts,
      setOpen: args.setBatchComposerOpen,
      setWorkspaceTab: args.setWorkspaceTab
    }),
    setTargetImage: (file) => setComposerTargetImage(args, file),
    setReferenceImages: (files) => setComposerReferenceImages(args, files),
    setImageAttachments: (targetImage, referenceImages) => setComposerImageAttachments(args, targetImage, referenceImages),
    setMask: (file) => setComposerMask(args, file),
    requestPresets
  };
}
