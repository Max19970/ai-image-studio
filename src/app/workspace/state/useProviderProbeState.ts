import { useEffect, useMemo, useState } from 'react';
import { getEffectiveProviderSettings } from '../../../entities/studio-settings';
import type { ProviderProbeReport, ProviderQuickCheckResult } from '../../../domain/providerProbe';
import type { StudioSettings } from '../../../domain/studioSettings';
import {
  loadProviderProbeReport,
  loadProviderProbeReportFromDatabase
} from '../../../processes/storage-sync/providerProbeCache';
import type { StateSetter } from '../types';

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
}

export function useProviderProbeState(studioSettings: StudioSettings): ProviderProbeWorkspaceState {
  const provider = useMemo(() => getEffectiveProviderSettings(studioSettings), [studioSettings]);
  const [probeError, setProbeError] = useState<string | null>(null);
  const [probingProviderId, setProbingProviderId] = useState<string | null>(null);
  const [quickCheckingProviderId, setQuickCheckingProviderId] = useState<string | null>(null);
  const [quickCheckResults, setQuickCheckResults] = useState<Record<string, ProviderQuickCheckResult>>({});
  const [capabilityReport, setCapabilityReport] = useState<ProviderProbeReport | null>(() => loadProviderProbeReport(provider));

  useEffect(() => {
    let cancelled = false;
    setCapabilityReport(loadProviderProbeReport(provider));
    setProbeError(null);
    void loadProviderProbeReportFromDatabase(provider).then((report) => {
      if (!cancelled) setCapabilityReport(report);
    });
    return () => { cancelled = true; };
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
    setCapabilityReport
  };
}
