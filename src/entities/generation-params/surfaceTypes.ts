import type { ReactNode } from 'react';
import type { GenerationRequestSnapshot, ProviderRequestParameterSummary } from '../../domain/generationTask';
import type { ImageParams } from '../../domain/imageParams';
import type { CapabilityKey, ProviderProbeReport } from '../../domain/providerProbe';
import type { ProviderSettings } from '../../domain/providerSettings';
import type { StudioSettings } from '../../domain/studioSettings';
import type { WorkMode } from '../../domain/workMode';
import type { GenerationParamSlot, GenerationParamTab, GenerationParamTabDefinition } from './types';

export type ProviderParamState = Record<string, unknown>;
export type ProviderParamStateBucket = Record<string, ProviderParamState>;

export interface ProviderParamStateContext {
  provider: ProviderSettings;
  params: ImageParams;
}

export interface ProviderGenerationSurfaceContext extends ProviderParamStateContext {
  mode: WorkMode;
  capabilityReport: ProviderProbeReport | null;
  studioSettings?: StudioSettings;
}

export interface ProviderGenerationSurfacePatchContext extends ProviderGenerationSurfaceContext {
  patch: <K extends keyof ImageParams>(key: K, value: ImageParams[K]) => void;
  setProviderParams: (next: ProviderParamState) => void;
  patchProviderParam: (key: string, value: unknown) => void;
}

export interface ProviderGenerationSurfacePayloadContext {
  provider: ProviderSettings;
  params: ImageParams;
  mode: WorkMode;
}

export interface ProviderGenerationSurfaceSnapshotContext extends ProviderGenerationSurfacePayloadContext {
  payload: Record<string, unknown>;
}

export interface ProviderGenerationSurfaceRestoreContext {
  previous: ImageParams;
  snapshot: GenerationRequestSnapshot;
}

export interface ProviderGenerationSurfaceHiddenSummary {
  capabilityKeys: readonly CapabilityKey[];
  paramLabelKeys: readonly string[];
}

export interface ProviderGenerationSurface {
  id: string;
  kind: 'logical-params' | 'provider-owned';
  getDefaultState: (provider: ProviderSettings) => ProviderParamState;
  getStateKey: (provider: ProviderSettings) => string;
  readState: (params: ImageParams, provider: ProviderSettings) => ProviderParamState;
  normalizeState: (value: unknown, provider: ProviderSettings) => ProviderParamState;
  normalizeParams: (value: Partial<ImageParams> | null | undefined) => ImageParams;
  getTabs: (context: ProviderGenerationSurfaceContext) => readonly GenerationParamTabDefinition[];
  getInitialTab: (context: ProviderGenerationSurfaceContext) => GenerationParamTab;
  getTabStats: (context: ProviderGenerationSurfaceContext, labels?: { retryOff: string }) => Record<GenerationParamTab, string>;
  getHiddenSummary: (context: ProviderGenerationSurfacePatchContext) => ProviderGenerationSurfaceHiddenSummary;
  renderSlot: (slot: GenerationParamSlot, context: ProviderGenerationSurfacePatchContext) => ReactNode[];
  buildPayload: (context: ProviderGenerationSurfacePayloadContext) => Record<string, unknown>;
  captureParamsSnapshot: (context: ProviderGenerationSurfaceSnapshotContext) => GenerationRequestSnapshot['params'];
  captureProviderParamsSnapshot: (context: ProviderGenerationSurfaceSnapshotContext) => ProviderParamState | undefined;
  captureParameterSummary: (context: ProviderGenerationSurfaceSnapshotContext) => ProviderRequestParameterSummary | undefined;
  restoreParamsFromSnapshot: (context: ProviderGenerationSurfaceRestoreContext) => ImageParams;
}
