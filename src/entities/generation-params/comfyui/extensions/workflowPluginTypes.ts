import type { ReactNode } from 'react';
import type { ProviderRequestParameterSummaryEntry } from '../../../../domain/generationTask';
import type { ProviderGenerationSurfacePatchContext } from '../../surfaceTypes';
import type { ComfyUiParamState, ComfyUiWorkflowBuilderItemKind } from '../stateTypes';

export type WorkflowPluginPayloadContext = {
  state: ComfyUiParamState;
  active: boolean;
};

export type WorkflowPluginDefinition = {
  kind: ComfyUiWorkflowBuilderItemKind;
  payloadKey: string;
  legacyPayloadKeys?: readonly string[];
  legacyKinds?: readonly string[];
  order?: number;
  labelKey: string;
  descriptionKey: string;
  isActive?: (state: ComfyUiParamState) => boolean;
  enableInState?: (state: ComfyUiParamState, active: boolean) => Partial<ComfyUiParamState>;
  getSummary: (state: ComfyUiParamState) => string;
  buildPayload?: (context: WorkflowPluginPayloadContext) => Record<string, unknown> | undefined;
  createSummaryEntry?: (context: WorkflowPluginPayloadContext & { payload: Record<string, unknown> }) => ProviderRequestParameterSummaryEntry | null;
  renderSettings: (context: ProviderGenerationSurfacePatchContext, state: ComfyUiParamState) => ReactNode[];
};
