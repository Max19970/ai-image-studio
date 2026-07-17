import type { GenerationModel, GenerationProvider } from '../../domain/providerSettings';
import { probeProvider, quickCheckProvider } from '../../processes/server-generation-actions';
import { toProviderSettings } from '../../entities/studio-settings';
import type { ProviderProbeStateCommands } from './types';

export function providerCheckKey(provider: GenerationProvider, model: GenerationModel | null): string {
  return `${provider.id}:${model?.id ?? model?.modelId ?? 'no-model'}`;
}

export async function probeProviderCommand(args: {
  provider: GenerationProvider;
  model: GenerationModel | null;
  state: ProviderProbeStateCommands;
}) {
  const { provider, model, state } = args;
  state.setProbingProviderId(provider.id);
  state.setProbeError(null);
  try {
    const effective = toProviderSettings(provider, model);
    const report = await probeProvider(effective);
    state.setCapabilityReport(report);
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
  const key = providerCheckKey(provider, model);
  state.setQuickCheckingProviderId(key);
  try {
    const result = await quickCheckProvider(toProviderSettings(provider, model));
    state.setQuickCheckResults((prev) => ({ ...prev, [key]: result }));
  } catch (e) {
    state.setQuickCheckResults((prev) => ({
      ...prev,
      [key]: {
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
  state: ProviderProbeStateCommands;
}) {
  const { provider, model, state } = args;
  const settings = toProviderSettings(provider, model);
  state.clearCapabilityReport(settings);
  state.setProbeError(null);
}
