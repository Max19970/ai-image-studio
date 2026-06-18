import type { ImageParams } from '../../domain/imageParams';
import type { ComposerCommands } from '../../interface/context/commands';
import type { CreateAppCommandsArgs } from './appCommandTypes';
import { submitSingleGenerationCommand } from './generationCommands';
import { openBatchComposerCommand } from './workspaceCommands';

export function createComposerCommands(args: CreateAppCommandsArgs): ComposerCommands {
  const patchParams = (patch: Partial<ImageParams>) => args.setParams((prev) => ({ ...prev, ...patch }));

  return {
    setMode: args.setMode,
    setModel: (modelId) => args.setStudioSettings((prev) => ({ ...prev, selectedModelId: modelId })),
    setPrompt: (prompt) => patchParams({ prompt }),
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
      args.setTargetImage(file);
      if (file) args.setMode('edit');
    },
    setReferenceImages: (files) => {
      args.setReferenceImages(files);
      if (files.length > 0) args.setMode('edit');
    },
    setMask: (file) => {
      args.setMask(file);
      if (file) args.setMode('edit');
    }
  };
}
