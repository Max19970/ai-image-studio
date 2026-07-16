import { resolveProviderGenerationMode } from '../../../entities/provider/modeResolution';
import { providerContextForModel } from '../../../entities/studio-settings';
import type { WorkspaceModalsContext } from '../../../interface/context/workspace/composerDock';
import type { WorkspaceContextFactoryArgs } from './types';

export function createModalsContext({ state, derived, commands }: WorkspaceContextFactoryArgs): WorkspaceModalsContext {
  const draft = state.composerParametersDraftId
    ? state.composerDrafts.find((item) => item.id === state.composerParametersDraftId) ?? null
    : null;
  const provider = draft
    ? providerContextForModel(state.studioSettings, draft.selectedModelId).provider
    : derived.provider;
  const providerMode = draft
    ? resolveProviderGenerationMode({
        settings: state.studioSettings,
        modelId: draft.selectedModelId,
        providerModeId: draft.providerModeId
      }).activeMode
    : derived.providerMode;

  return {
    composerParameters: {
      draft,
      provider,
      providerMode,
      capabilityReport: draft?.selectedModelId === derived.activeComposerDraft.selectedModelId
        ? state.capabilityReport
        : null,
      studioSettings: state.studioSettings,
      warnings: draft?.id === derived.activeComposerDraft.id ? derived.warnings : derived.batchWarnings,
      commands: commands.parameters
    }
  };
}
