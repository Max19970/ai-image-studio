import type { CapabilityEntry, CapabilityKey, ProviderProbeReport } from '../../domain/providerProbe';
import type { GeneratedImage, GenerationProgress } from '../../domain/generationTask';
import type { ImageParams } from '../../domain/imageParams';
import type { ProviderSettings } from '../../domain/providerSettings';
import type { ProviderGenerationModeDefinition } from '../../domain/providerMode';
import type { ProviderResourceDescriptor, ProviderResourceKind } from '../../domain/providerResources';
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

export type ProviderAdapterKind = 'openai-compatible' | 'comfyui';

export interface ProviderRuntimeCapabilities {
  supportsGenerate: boolean;
  supportsEdit: boolean;
  supportsImageAttachments: boolean;
  supportsMask: boolean;
  supportsStreaming: boolean;
  usesLocalWorkflow: boolean;
  hasLiveResources: boolean;
}

export interface ProviderGenerationSurfaceDefinition {
  id: string;
  kind: 'logical-params' | 'provider-owned';
  description: string;
}

export interface ProviderDetailDescriptorDefinition {
  id: string;
  kind: 'request-snapshot' | 'provider-owned';
  label: string;
}

export interface ProviderControlSurfaceDefinition {
  id: string;
  kind: 'api-image' | 'local-workflow';
  showModeSwitcher: boolean;
  showImageAttachments: boolean;
  showMask: boolean;
  showLoraRegistry: boolean;
  showParameters: boolean;
  showBatch: boolean;
}

export interface ProviderSubmitProxyRequestInput {
  provider: ProviderSettings;
  payload: Record<string, unknown>;
  mode: WorkMode;
  providerMode?: ProviderGenerationModeDefinition | null;
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
  getSize(params: ImageParams, providerMode?: ProviderGenerationModeDefinition | null): string | undefined;
  validateCustomSize(width: number, height: number, providerMode?: ProviderGenerationModeDefinition | null): string[];
  parseRawJson(rawJson: string): Record<string, unknown>;
  buildImagePayload(params: ImageParams, provider: ProviderSettings, mode: WorkMode, providerMode?: ProviderGenerationModeDefinition | null): Record<string, unknown>;
  explainPayloadWarnings(
    payload: Record<string, unknown>,
    provider: ProviderSettings,
    mode: WorkMode,
    capabilityReport: ProviderProbeReport | null,
    providerMode?: ProviderGenerationModeDefinition | null
  ): string[];
  createSubmitProxyRequest(input: ProviderSubmitProxyRequestInput): ProviderSubmitProxyRequestConfig;
}

export interface ProviderResponseAdapter {
  collectImagesFromJson(json: unknown, fallbackFormat?: string): GeneratedImage[];
  collectProgressFromJson?(json: unknown): GenerationProgress | null;
  collectErrorFromJson?(json: unknown): string | null;
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
  capabilities: ProviderRuntimeCapabilities;
  resources: ProviderResourceDescriptor;
  generationSurface: ProviderGenerationSurfaceDefinition;
  detailDescriptor: ProviderDetailDescriptorDefinition;
  controlSurface: ProviderControlSurfaceDefinition;
  generationModes?: ProviderGenerationModeDefinition[];
  settingsFields: ProviderAdapterSettingsField[];
  modelResourceKind?: ProviderResourceKind;
  generationParams: ProviderGenerationParamProfile;
  capabilitiesFromProbe(report: ProviderProbeReport): ModelCapabilities;
  request: ProviderRequestAdapter;
  response: ProviderResponseAdapter;
}
