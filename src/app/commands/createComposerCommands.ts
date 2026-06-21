import type { ImageParams } from '../../domain/imageParams';
import type { ComposerCommands } from '../../interface/context/commands';
import {
  applyComposerCompatibilityForModel,
  getComposerModeForAttachmentRole,
  setComposerDraftWithCompatibility,
  setComposerProviderModeWithCompatibility,
} from './providerCompatibilityCommands';
import type { CreateAppCommandsArgs } from './appCommandTypes';
import { submitSingleGenerationCommand } from './generationCommands';
import { openBatchComposerCommand } from './workspaceCommands';

export function createComposerCommands(args: CreateAppCommandsArgs): ComposerCommands {
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
      t: args.t
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
    setTargetImage: (file) => {
      setComposerDraftWithCompatibility(args, {
        providerModeId: file ? getComposerModeForAttachmentRole(args, 'targetImage') : args.providerModeId,
        targetImage: file,
        referenceImages: args.referenceImages,
        mask: args.mask
      });
    },
    setReferenceImages: (files) => {
      setComposerDraftWithCompatibility(args, {
        providerModeId: files.length > 0 ? getComposerModeForAttachmentRole(args, 'referenceImage') : args.providerModeId,
        targetImage: args.targetImage,
        referenceImages: files,
        mask: args.mask
      });
    },
    setImageAttachments: (targetImage, referenceImages) => {
      const providerModeId = targetImage
        ? getComposerModeForAttachmentRole(args, 'targetImage')
        : referenceImages.length > 0
          ? getComposerModeForAttachmentRole(args, 'referenceImage')
          : args.providerModeId;
      setComposerDraftWithCompatibility(args, {
        providerModeId,
        targetImage,
        referenceImages,
        mask: args.mask
      });
    },
    setMask: (file) => {
      setComposerDraftWithCompatibility(args, {
        providerModeId: file ? getComposerModeForAttachmentRole(args, 'mask') : args.providerModeId,
        targetImage: args.targetImage,
        referenceImages: args.referenceImages,
        mask: file
      });
    }
  };
}
