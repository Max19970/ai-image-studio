import type { SettingsCommands } from '../../interface/context/commands';
import type { CreateAppCommandsArgs } from './appCommandTypes';
import { clearProviderProbeCacheCommand, probeProviderCommand, quickCheckProviderCommand } from './providerCommands';

export function createSettingsCommands(args: CreateAppCommandsArgs): SettingsCommands {
  const selection = {
    settings: args.studioSettings,
    activeProvider: args.activeProvider,
    activeModel: args.activeModel,
    setSettings: args.setStudioSettings
  };

  return {
    save: (next) => args.setStudioSettings(args.normalizeSettings(next)),
    selectModel: (modelId) => args.setStudioSettings((prev) => ({ ...prev, selectedModelId: modelId })),
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
