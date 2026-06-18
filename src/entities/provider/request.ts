import type { ImageParams } from '../../domain/imageParams';
import type { ProviderProbeReport } from '../../domain/providerProbe';
import type { ProviderSettings } from '../../domain/providerSettings';
import type { WorkMode } from '../../domain/workMode';
import { getProviderAdapterForSettings } from './registry';

export function getSize(params: ImageParams, provider?: ProviderSettings | null): string | undefined {
  return getProviderAdapterForSettings(provider).request.getSize(params);
}

export function validateCustomSize(width: number, height: number, provider?: ProviderSettings | null): string[] {
  return getProviderAdapterForSettings(provider).request.validateCustomSize(width, height);
}

export function parseRawJson(rawJson: string, provider?: ProviderSettings | null): Record<string, unknown> {
  return getProviderAdapterForSettings(provider).request.parseRawJson(rawJson);
}

export function buildImagePayload(params: ImageParams, provider: ProviderSettings, mode: WorkMode): Record<string, unknown> {
  return getProviderAdapterForSettings(provider).request.buildImagePayload(params, provider, mode);
}

export function explainPayloadWarnings(payload: Record<string, unknown>, provider: ProviderSettings, mode: WorkMode, capabilityReport: ProviderProbeReport | null): string[] {
  return getProviderAdapterForSettings(provider).request.explainPayloadWarnings(payload, provider, mode, capabilityReport);
}
