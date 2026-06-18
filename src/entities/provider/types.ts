import type { CapabilityEntry, CapabilityKey, ProviderProbeReport } from '../../domain/providerProbe';
import type { GeneratedImage } from '../../domain/generationTask';
import type { ImageParams } from '../../domain/imageParams';
import type { ProviderSettings } from '../../domain/providerSettings';
import type { WorkMode } from '../../domain/workMode';
import type { ProviderGenerationParamProfile } from '../generation-params/types';

export interface ModelCapabilities {
  fingerprint: string;
  createdAt: number;
  providerLabel: string;
  caveat?: string;
  generation: Partial<Record<CapabilityKey, CapabilityEntry>>;
  edit: Partial<Record<CapabilityKey, CapabilityEntry>>;
}

export type ProviderAdapterKind = 'openai-compatible';

export interface ProviderSubmitProxyRequestInput {
  provider: ProviderSettings;
  payload: Record<string, unknown>;
  mode: WorkMode;
  targetImage?: File | null;
  referenceImages?: File[];
  mask?: File | null;
  signal?: AbortSignal;
}

export interface ProviderSubmitProxyRequestConfig {
  path: string;
  init: RequestInit;
  streamed: boolean;
  fallbackFormat: string;
}

export interface ProviderRequestAdapter {
  getSize(params: ImageParams): string | undefined;
  validateCustomSize(width: number, height: number): string[];
  parseRawJson(rawJson: string): Record<string, unknown>;
  buildImagePayload(params: ImageParams, provider: ProviderSettings, mode: WorkMode): Record<string, unknown>;
  explainPayloadWarnings(
    payload: Record<string, unknown>,
    provider: ProviderSettings,
    mode: WorkMode,
    capabilityReport: ProviderProbeReport | null
  ): string[];
  createSubmitProxyRequest(input: ProviderSubmitProxyRequestInput): ProviderSubmitProxyRequestConfig;
}

export interface ProviderResponseAdapter {
  collectImagesFromJson(json: unknown, fallbackFormat?: string): GeneratedImage[];
  parseSseBlock(block: string): unknown[];
}


export type ProviderAdapterSettingsFieldKind = 'endpoint' | 'secret' | 'text' | 'json' | 'number';
export type ProviderAdapterEndpointOperation = 'generate' | 'edit' | 'responses';

export interface ProviderAdapterSettingsField {
  key: keyof ProviderSettings;
  label: string;
  kind: ProviderAdapterSettingsFieldKind;
  operation?: ProviderAdapterEndpointOperation;
  required?: boolean;
  sensitive?: boolean;
}

export interface ProviderAdapterDefinition {
  id: ProviderAdapterKind | string;
  label: string;
  description: string;
  defaultGenerationEndpoint: string;
  defaultEditEndpoint: string;
  supportsMultipartEdit: boolean;
  settingsFields: ProviderAdapterSettingsField[];
  generationParams: ProviderGenerationParamProfile;
  capabilitiesFromProbe(report: ProviderProbeReport): ModelCapabilities;
  request: ProviderRequestAdapter;
  response: ProviderResponseAdapter;
}
