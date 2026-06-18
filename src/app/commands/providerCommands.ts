import type { GenerationModel, GenerationProvider } from '../../domain/providerSettings';
import { probeProvider, quickCheckProvider } from '../../infrastructure/api';
import { toProviderSettings } from '../../entities/studio-settings';
import { clearProviderProbeReport, saveProviderProbeReport } from '../../processes/storage-sync';
import type { ProviderProbeStateCommands, SettingsSelectionContext } from './types';

export async function probeProviderCommand(args: {
  provider: GenerationProvider;
  model: GenerationModel | null;
  selection: SettingsSelectionContext;
  state: ProviderProbeStateCommands;
}) {
  const { provider, model, selection, state } = args;
  state.setProbingProviderId(provider.id);
  state.setProbeError(null);
  try {
    const effective = toProviderSettings(provider, model);
    const report = await probeProvider(effective);
    saveProviderProbeReport(report);
    if (provider.id === selection.activeProvider?.id && model?.id === selection.activeModel?.id) {
      state.setCapabilityReport(report);
    }
  } catch (e) {
    state.setProbeError(e instanceof Error ? e.message : String(e));
  } finally {
    state.setProbingProviderId(null);
  }
}

export async function quickCheckProviderCommand(args: {
  provider: GenerationProvider;
  model: GenerationModel | null;
  state: ProviderProbeStateCommands;
}) {
  const { provider, model, state } = args;
  state.setQuickCheckingProviderId(provider.id);
  try {
    const result = await quickCheckProvider(toProviderSettings(provider, model));
    state.setQuickCheckResults((prev) => ({ ...prev, [provider.id]: result }));
  } catch (e) {
    state.setQuickCheckResults((prev) => ({
      ...prev,
      [provider.id]: {
        ok: false,
        status: null,
        message: e instanceof Error ? e.message : String(e),
        createdAt: Date.now()
      }
    }));
  } finally {
    state.setQuickCheckingProviderId(null);
  }
}

export function clearProviderProbeCacheCommand(args: {
  provider: GenerationProvider;
  model: GenerationModel | null;
  selection: SettingsSelectionContext;
  state: ProviderProbeStateCommands;
}) {
  const { provider, model, selection, state } = args;
  clearProviderProbeReport(toProviderSettings(provider, model));
  if (provider.id === selection.activeProvider?.id && model?.id === selection.activeModel?.id) {
    state.setCapabilityReport(null);
  }
  state.setProbeError(null);
}
