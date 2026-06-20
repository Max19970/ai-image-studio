import type { ComponentType } from 'react';
import type { CapabilityKey, ProviderProbeReport } from '../../domain/providerProbe';
import type { GenerationRequestSnapshot } from '../../domain/generationTask';
import type { ImageParams } from '../../domain/imageParams';
import type { ProviderGenerationModeDefinition } from '../../domain/providerMode';
import type { ProviderSettings } from '../../domain/providerSettings';
import type { WorkMode } from '../../domain/workMode';


export type ProviderGenerationParamSet = 'all' | readonly string[];

export interface ProviderGenerationParamModelRule {
  modelIdIncludes: readonly string[];
  include?: ProviderGenerationParamSet;
  exclude?: readonly string[];
}

export interface GenerationParamAvailabilityContext {
  provider: ProviderSettings;
  mode: WorkMode;
  providerMode?: ProviderGenerationModeDefinition | null;
  capabilityReport: ProviderProbeReport | null;
  params?: ImageParams;
  definition: GenerationParamDefinition;
  current: boolean;
}

export interface ProviderGenerationParamProfile {
  id: string;
  include: ProviderGenerationParamSet;
  byMode?: Partial<Record<WorkMode, ProviderGenerationParamSet>>;
  exclude?: readonly string[];
  modelRules?: readonly ProviderGenerationParamModelRule[];
  isAvailable?: (context: GenerationParamAvailabilityContext) => boolean;
}

export type BuiltInGenerationParamTab = 'frame' | 'render' | 'output' | 'service' | 'retry';
export type GenerationParamTab = BuiltInGenerationParamTab | (string & {});
export type GenerationParamSlot = `composer/parameters/${GenerationParamTab}`;

export type GenerationParamCopyKey =
  | 'n'
  | 'sizeMode'
  | 'preset'
  | 'width'
  | 'height'
  | 'quality'
  | 'background'
  | 'moderation'
  | 'style'
  | 'inputFidelity'
  | 'outputFormat'
  | 'compression'
  | 'stream'
  | 'partialImages'
  | 'responseFormat'
  | 'user'
  | 'includeModel'
  | 'rawJson'
  | 'retryAttempts'
  | 'retryDelaySeconds';

export type GenerationParamOptionGroup =
  | 'sizeMode'
  | 'boolean'
  | 'outputFormat'
  | 'quality'
  | 'background'
  | 'inputFidelity'
  | 'moderation'
  | 'style'
  | 'responseFormat';

export interface GenerationParamCopyDescriptor {
  labelKey: string;
  descriptionKey?: string;
  ariaLabelKey?: string;
}

export interface GenerationParamOptionDescriptor<TValue extends string = string> {
  value: TValue;
  labelKey?: string;
  label?: string;
}

export interface GenerationParamTabDefinition {
  id: GenerationParamTab;
  slot: GenerationParamSlot;
  labelKey: string;
  hintKey: string;
  panelClassKey?: 'retryTabPanel';
}

export interface GenerationParamFieldContext {
  mode: WorkMode;
  providerMode?: ProviderGenerationModeDefinition | null;
  params: ImageParams;
  provider: ProviderSettings;
  capabilityReport: ProviderProbeReport | null;
  patch: <K extends keyof ImageParams>(key: K, value: ImageParams[K]) => void;
}

export interface GenerationParamFieldProps<TProps extends object = Record<string, unknown>> {
  context: GenerationParamFieldContext;
  placement: ResolvedGenerationParamFieldPlacement<TProps>;
  props: TProps;
}

export interface GenerationParamFieldDefinition<TProps extends object = Record<string, unknown>> {
  id: string;
  Component: ComponentType<GenerationParamFieldProps<TProps>>;
  defaultProps?: Partial<TProps>;
  enabled?: (context: GenerationParamFieldContext, props: TProps) => boolean;
  sourcePath?: string;
}

export interface GenerationParamFieldPlacement<TProps extends object = Record<string, unknown>> {
  id: string;
  slot: GenerationParamSlot;
  use: string;
  order: number;
  props?: Partial<TProps>;
  requiresCapability?: CapabilityKey;
  mode?: WorkMode | 'any';
}

export interface ResolvedGenerationParamFieldPlacement<TProps extends object = Record<string, unknown>> extends GenerationParamFieldPlacement<TProps> {
  sourcePath: string;
  definitionSourcePath: string;
}

export interface OpenAiCompatibleParamPayloadContext {
  params: ImageParams;
  provider: ProviderSettings;
  mode: WorkMode;
  providerMode?: ProviderGenerationModeDefinition | null;
}

export interface RestoreGenerationParamContext {
  previous: ImageParams;
  snapshot: GenerationRequestSnapshot;
}

export interface NormalizeGenerationParamContext {
  value: Partial<ImageParams> | null | undefined;
  current: ImageParams;
  defaults: ImageParams;
}

export interface GenerationParamDefinition {
  id: string;
  stateKeys: readonly (keyof ImageParams)[];
  fieldDefinitionId: string;
  placementIds: readonly string[];
  i18nNamespace: string;
  copy?: Partial<Record<GenerationParamCopyKey, GenerationParamCopyDescriptor>>;
  options?: Partial<Record<GenerationParamOptionGroup, readonly GenerationParamOptionDescriptor[]>>;
  capability?: CapabilityKey;
  includeKey?: keyof ImageParams;
  payloadKeys?: readonly string[];
  snapshotKeys?: readonly (keyof GenerationRequestSnapshot['params'])[];
  normalize?: (context: NormalizeGenerationParamContext) => Partial<ImageParams>;
  restore?: (context: RestoreGenerationParamContext) => Partial<ImageParams>;
  openAiCompatiblePayload?: (context: OpenAiCompatibleParamPayloadContext) => Record<string, unknown>;
}
