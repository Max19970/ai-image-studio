import type { CapabilityKey, ProviderProbeReport } from '../../domain/providerProbe';
import type { WorkMode } from '../../domain/workMode';
import type { ModelCapabilities } from './types';

export function modelCapabilitiesFromProbeReport(report: ProviderProbeReport): ModelCapabilities {
  return {
    fingerprint: report.fingerprint,
    createdAt: report.createdAt,
    providerLabel: report.providerLabel,
    caveat: report.caveat,
    generation: report.generation,
    edit: report.edit
  };
}

export function isProviderCapabilitySupported(report: ProviderProbeReport | null, mode: WorkMode, key: CapabilityKey): boolean {
  const bucket = mode === 'generate' ? report?.generation : report?.edit;
  const entry = bucket?.[key];
  return !entry || entry.supported !== false;
}

export function getUnsupportedProviderCapabilityKeys(
  context: { mode: WorkMode; capabilityReport: ProviderProbeReport | null },
  keys: CapabilityKey[]
): CapabilityKey[] {
  return keys.filter((key) => {
    if (context.mode === 'generate' && key === 'input_fidelity') return false;
    return !isProviderCapabilitySupported(context.capabilityReport, context.mode, key);
  });
}
