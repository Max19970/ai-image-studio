import { resolveProviderGenerationMode } from '../../../entities/provider/modeResolution';
import { providerContextForModel } from '../../../entities/studio-settings';
import type { WorkspaceModalsContext } from '../../../interface/context/workspace/composerDock';
import type { WorkspaceContextFactoryArgs } from './types';

export function createModalsContext({ state, derived, commands }: WorkspaceContextFactoryArgs): WorkspaceModalsContext {
  const batchProvider = derived.activeBatchDraft
    ? providerContextForModel(state.studioSettings, derived.activeBatchDraft.selectedModelId).provider
    : derived.provider;
  const batchProviderMode = derived.activeBatchDraft
    ? resolveProviderGenerationMode({
      settings: state.studioSettings,
      modelId: derived.activeBatchDraft.selectedModelId,
      providerModeId: derived.activeBatchDraft.providerModeId
    }).activeMode
    : derived.providerMode;

  return {
    singleParameters: {
      open: state.parametersOpen,
      mode: derived.mode,
      providerMode: derived.providerMode,
      params: state.params,
      provider: derived.provider,
      capabilityReport: state.capabilityReport,
      studioSettings: state.studioSettings,
      warnings: derived.warnings,
      commands: commands.parameters
    },
    batchParameters: {
      draft: derived.activeBatchDraft,
      provider: batchProvider,
      providerMode: batchProviderMode,
      capabilityReport: derived.activeBatchDraft?.selectedModelId === state.studioSettings.selectedModelId
        ? state.capabilityReport
        : null,
      studioSettings: state.studioSettings,
      warnings: derived.batchWarnings,
      commands: commands.parameters
    }
  };
}
