import type { ImageParams } from '../../domain/imageParams';
import type { ComposerCommands } from '../../interface/context/commands';
import {
  applyComposerCompatibilityForModel,
  setComposerDraftWithCompatibility,
  setComposerModeWithCompatibility,
} from './providerCompatibilityCommands';
import type { CreateAppCommandsArgs } from './appCommandTypes';
import { submitSingleGenerationCommand } from './generationCommands';
import { openBatchComposerCommand } from './workspaceCommands';

export function createComposerCommands(args: CreateAppCommandsArgs): ComposerCommands {
  const patchParams = (patch: Partial<ImageParams>) => args.setParams((prev) => ({ ...prev, ...patch }));

  return {
    setMode: (mode) => setComposerModeWithCompatibility(args, mode),
    setModel: (modelId) => {
      args.setStudioSettings((prev) => args.normalizeSettings({ ...prev, selectedModelId: modelId }));
      applyComposerCompatibilityForModel(args, args.studioSettings, modelId);
    },
    setPrompt: (prompt) => patchParams({ prompt }),
    patchParams: args.setParams,
    submit: () => submitSingleGenerationCommand({
      canSubmit: args.canSubmit,
      mode: args.mode,
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
      t: args.t
    }),
    openParameters: () => args.setParametersOpen(true),
    openBatchComposer: () => openBatchComposerCommand({
      mode: args.mode,
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
        mode: file ? 'edit' : args.mode,
        targetImage: file,
        referenceImages: args.referenceImages,
        mask: args.mask
      });
    },
    setReferenceImages: (files) => {
      setComposerDraftWithCompatibility(args, {
        mode: files.length > 0 ? 'edit' : args.mode,
        targetImage: args.targetImage,
        referenceImages: files,
        mask: args.mask
      });
    },
    setMask: (file) => {
      setComposerDraftWithCompatibility(args, {
        mode: file ? 'edit' : args.mode,
        targetImage: args.targetImage,
        referenceImages: args.referenceImages,
        mask: file
      });
    }
  };
}
