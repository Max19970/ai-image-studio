import type { SettingsCommands } from '../../interface/context/commands';
import type { SettingsCommandDeps } from './appCommandTypes';
import { applyComposerCompatibilityForModel, sanitizeBatchDraftsAfterSettingsChange } from './providerCompatibilityCommands';
import { clearProviderProbeCacheCommand, probeProviderCommand, quickCheckProviderCommand } from './providerCommands';

export function createSettingsCommands(args: SettingsCommandDeps): SettingsCommands {
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
      applyComposerCompatibilityForModel(args.composerCompatibility, normalized, normalized.selectedModelId);
      sanitizeBatchDraftsAfterSettingsChange(args.batchCompatibility, normalized);
    },
    selectModel: (modelId) => {
      args.setStudioSettings((prev) => args.normalizeSettings({ ...prev, selectedModelId: modelId }));
      applyComposerCompatibilityForModel(args.composerCompatibility, args.studioSettings, modelId);
    },
    probeProvider: (provider, model) => probeProviderCommand({
      provider,
      model,
      selection,
      state: args.providerProbe
    }),
    quickCheckProvider: (provider, model) => quickCheckProviderCommand({
      provider,
      model,
      state: args.providerProbe
    }),
    clearProbeCache: (provider, model) => clearProviderProbeCacheCommand({
      provider,
      model,
      selection,
      state: args.providerProbe
    })
  };
}
