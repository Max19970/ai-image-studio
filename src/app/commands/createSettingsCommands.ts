import type { SettingsCommands } from '../../interface/context/commands';
import type { CreateAppCommandsArgs } from './appCommandTypes';
import { applyComposerCompatibilityForModel, sanitizeBatchDraftsAfterSettingsChange } from './providerCompatibilityCommands';
import { clearProviderProbeCacheCommand, probeProviderCommand, quickCheckProviderCommand } from './providerCommands';

export function createSettingsCommands(args: CreateAppCommandsArgs): SettingsCommands {
  const selection = {
    settings: args.studioSettings,
    activeProvider: args.activeProvider,
    activeModel: args.activeModel,
    setSettings: args.setStudioSettings
  };

  return {
    save: (next) => {
      const normalized = args.normalizeSettings(next);
      args.setStudioSettings(normalized);
      applyComposerCompatibilityForModel(args, normalized, normalized.selectedModelId);
      sanitizeBatchDraftsAfterSettingsChange(args, normalized);
    },
    selectModel: (modelId) => {
      args.setStudioSettings((prev) => args.normalizeSettings({ ...prev, selectedModelId: modelId }));
      applyComposerCompatibilityForModel(args, args.studioSettings, modelId);
    },
    probeProvider: (provider, model) => probeProviderCommand({
      provider,
      model,
      selection,
      state: args.providerProbeState
    }),
    quickCheckProvider: (provider, model) => quickCheckProviderCommand({
      provider,
      model,
      state: args.providerProbeState
    }),
    clearProbeCache: (provider, model) => clearProviderProbeCacheCommand({
      provider,
      model,
      selection,
      state: args.providerProbeState
    })
  };
}
