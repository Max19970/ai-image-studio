import type { GenerationRequestSnapshot, ProviderRequestParameterSummary } from '../../domain/generationTask';
import type { ImageParams } from '../../domain/imageParams';
import type { ProviderGenerationModeDefinition } from '../../domain/providerMode';
import type { ProviderSettings } from '../../domain/providerSettings';
import type { WorkMode } from '../../domain/workMode';
import type { ProviderParamState } from './surfaceTypes';

export interface ProviderGenerationRequestSurfacePayloadContext {
  provider: ProviderSettings;
  params: ImageParams;
  mode: WorkMode;
  providerMode: ProviderGenerationModeDefinition;
}

export interface ProviderGenerationRequestSurfaceSnapshotContext extends ProviderGenerationRequestSurfacePayloadContext {
  payload: Record<string, unknown>;
}

export interface ProviderGenerationRequestSurfaceRestoreContext {
  previous: ImageParams;
  snapshot: GenerationRequestSnapshot;
}

export interface ProviderGenerationRequestSurface {
  id: string;
  kind: 'logical-params' | 'provider-owned';
  buildPayload: (context: ProviderGenerationRequestSurfacePayloadContext) => Record<string, unknown>;
  captureParamsSnapshot: (context: ProviderGenerationRequestSurfaceSnapshotContext) => GenerationRequestSnapshot['params'];
  captureProviderParamsSnapshot: (context: ProviderGenerationRequestSurfaceSnapshotContext) => ProviderParamState | undefined;
  captureParameterSummary: (context: ProviderGenerationRequestSurfaceSnapshotContext) => ProviderRequestParameterSummary | undefined;
  restoreParamsFromSnapshot: (context: ProviderGenerationRequestSurfaceRestoreContext) => ImageParams;
}
