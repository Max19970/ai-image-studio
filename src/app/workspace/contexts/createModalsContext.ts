import { providerContextForModel } from '../../../entities/studio-settings';
import type { WorkspaceModalsContext } from '../../../interface/context/workspace/composerDock';
import type { WorkspaceContextFactoryArgs } from './types';

export function createModalsContext({ state, derived, commands }: WorkspaceContextFactoryArgs): WorkspaceModalsContext {
  const batchProvider = derived.activeBatchDraft
    ? providerContextForModel(state.studioSettings, derived.activeBatchDraft.selectedModelId).provider
    : derived.provider;

  return {
    singleParameters: {
      open: state.parametersOpen,
      mode: state.mode,
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
      capabilityReport: derived.activeBatchDraft?.selectedModelId === state.studioSettings.selectedModelId
        ? state.capabilityReport
        : null,
      studioSettings: state.studioSettings,
      warnings: derived.batchWarnings,
      commands: commands.parameters
    }
  };
}
