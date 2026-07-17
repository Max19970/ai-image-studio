import { useCallback, useEffect, useMemo, useState } from 'react';
import { getEffectiveProviderSettings } from '../../../entities/studio-settings';
import {
  getCachedProviderProbeReport,
  withoutCachedProviderProbeReport,
  withCachedProviderProbeReport
} from '../../../entities/provider-probe-cache';
import type { ProviderProbeReport, ProviderQuickCheckResult } from '../../../domain/providerProbe';
import type { StudioSettings } from '../../../domain/studioSettings';
import type { ProviderSettings } from '../../../domain/providerSettings';
import { providerProbeCacheSyncDescriptor } from '../../../processes/storage-sync/providerProbeCache';
import type { StateSetter } from '../types';
import { useSyncedDocumentState } from './useSyncedDocumentState';

export interface ProviderProbeWorkspaceState {
  probeError: string | null;
  setProbeError: StateSetter<string | null>;
  probingProviderId: string | null;
  setProbingProviderId: StateSetter<string | null>;
  quickCheckingProviderId: string | null;
  setQuickCheckingProviderId: StateSetter<string | null>;
  quickCheckResults: Record<string, ProviderQuickCheckResult>;
  setQuickCheckResults: StateSetter<Record<string, ProviderQuickCheckResult>>;
  capabilityReport: ProviderProbeReport | null;
  setCapabilityReport: StateSetter<ProviderProbeReport | null>;
  clearCapabilityReport(settings: ProviderSettings): void;
}

export function useProviderProbeState(studioSettings: StudioSettings): ProviderProbeWorkspaceState {
  const provider = useMemo(() => getEffectiveProviderSettings(studioSettings), [studioSettings]);
  const cache = useSyncedDocumentState(providerProbeCacheSyncDescriptor, undefined);
  const [probeError, setProbeError] = useState<string | null>(null);
  const [probingProviderId, setProbingProviderId] = useState<string | null>(null);
  const [quickCheckingProviderId, setQuickCheckingProviderId] = useState<string | null>(null);
  const [quickCheckResults, setQuickCheckResults] = useState<Record<string, ProviderQuickCheckResult>>({});

  const capabilityReport = useMemo(
    () => getCachedProviderProbeReport(cache.value, provider),
    [cache.value, provider]
  );

  const setCapabilityReport = useCallback<StateSetter<ProviderProbeReport | null>>((update) => {
    cache.setValue((currentMap) => {
      const currentReport = getCachedProviderProbeReport(currentMap, provider);
      const nextReport = typeof update === 'function' ? update(currentReport) : update;
      return nextReport
        ? withCachedProviderProbeReport(currentMap, nextReport)
        : withoutCachedProviderProbeReport(currentMap, provider);
    });
  }, [cache.setValue, provider]);

  const clearCapabilityReport = useCallback((settings: ProviderSettings) => {
    cache.setValue((currentMap) => withoutCachedProviderProbeReport(currentMap, settings));
  }, [cache.setValue]);

  useEffect(() => {
    setProbeError(null);
  }, [provider]);

  return {
    probeError,
    setProbeError,
    probingProviderId,
    setProbingProviderId,
    quickCheckingProviderId,
    setQuickCheckingProviderId,
    quickCheckResults,
    setQuickCheckResults,
    capabilityReport,
    setCapabilityReport,
    clearCapabilityReport
  };
}
