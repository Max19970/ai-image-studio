import type { ReactNode } from 'react';
import type { ProviderGenerationSurfacePatchContext } from '../../surfaceTypes';
import type { ComfyUiParamState, ComfyUiWorkflowBuilderItemKind } from '../state';

export type WorkflowPluginDefinition = {
  kind: ComfyUiWorkflowBuilderItemKind;
  labelKey: string;
  descriptionKey: string;
  getSummary: (state: ComfyUiParamState) => string;
  renderSettings: (context: ProviderGenerationSurfacePatchContext, state: ComfyUiParamState) => ReactNode[];
};
