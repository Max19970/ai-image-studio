import type { ProviderRequestParameterSummaryEntry } from '../../../../domain/generationTask';
import type { ProviderGenerationExtension } from '../../extensionTypes';
import { readComfyUiParamState, type ComfyUiParamState, type ComfyUiWorkflowBuilderItemKind } from '../state';
import { workflowPluginDefinitionsByKind } from './plugins';

function isWorkflowPluginActive(state: ComfyUiParamState, kind: ComfyUiWorkflowBuilderItemKind): boolean {
  const definition = workflowPluginDefinitionsByKind.get(kind);
  return definition?.isActive ? definition.isActive(state) : state.workflowBuilder.includes(kind);
}

export function buildComfyUiWorkflowPluginsPayload(state: ComfyUiParamState): Record<string, unknown> {
  const result: Record<string, unknown> = {
    workflow_order: state.workflowBuilder.flatMap((kind) => {
      const definition = workflowPluginDefinitionsByKind.get(kind);
      return definition ? [definition.payloadKey] : [];
    })
  };

  for (const kind of state.workflowBuilder) {
    const definition = workflowPluginDefinitionsByKind.get(kind);
    if (!definition?.buildPayload) continue;
    const next = definition.buildPayload({ state, active: isWorkflowPluginActive(state, kind) });
    if (next !== undefined) result[definition.payloadKey] = next;
  }

  return result;
}

export function createComfyUiWorkflowPluginsSummaryEntries(state: ComfyUiParamState): ProviderRequestParameterSummaryEntry[] {
  const result = buildComfyUiWorkflowPluginsPayload(state);
  return state.workflowBuilder.flatMap((kind) => {
    const definition = workflowPluginDefinitionsByKind.get(kind);
    if (!definition?.createSummaryEntry) return [];
    const entry = definition.createSummaryEntry({ state, active: isWorkflowPluginActive(state, kind), payload: result });
    return entry ? [entry] : [];
  });
}

export const comfyUiWorkflowPluginsPayloadExtension: ProviderGenerationExtension = {
  id: 'comfyui.extension.workflow-plugins.payload',
  order: 20,
  buildPayload: ({ params, provider }) => buildComfyUiWorkflowPluginsPayload(readComfyUiParamState(params, provider)),
  captureParameterSummaryEntries: ({ params, provider }) => createComfyUiWorkflowPluginsSummaryEntries(readComfyUiParamState(params, provider))
};
