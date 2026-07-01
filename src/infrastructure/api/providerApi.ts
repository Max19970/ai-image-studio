import type { ProviderProbeReport, ProviderQuickCheckResult } from '../../domain/providerProbe';
import type { ProviderSettings } from '../../domain/providerSettings';
import type { ProviderResourceKind, ProviderResourceList } from '../../domain/providerResources';
import { fetchProxy, readJsonOrThrow } from './common';

export async function probeProvider(provider: ProviderSettings): Promise<ProviderProbeReport> {
  const response = await fetchProxy('/api/provider/probe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider })
  });

  const raw = await readJsonOrThrow(response);
  return raw as ProviderProbeReport;
}

export async function quickCheckProvider(provider: ProviderSettings): Promise<ProviderQuickCheckResult> {
  const response = await fetchProxy('/api/provider/quick-check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider })
  });

  const raw = await readJsonOrThrow(response);
  return raw as ProviderQuickCheckResult;
}

export async function fetchProviderResources(provider: ProviderSettings, kind: ProviderResourceKind): Promise<ProviderResourceList> {
  const response = await fetchProxy('/api/provider/resources', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, kind })
  });

  const raw = await readJsonOrThrow(response);
  return raw as ProviderResourceList;
}
