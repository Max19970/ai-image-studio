import { capabilityOrder } from '../../domain/defaults';
import type { ImageParams } from '../../domain/imageParams';
import type { ProviderSettings } from '../../domain/providerSettings';
import type { ProviderGenerationModeDefinition } from '../../domain/providerMode';
import type { WorkMode } from '../../domain/workMode';
import { getGenerationParamPrimaryLabelKey } from './availability';
import { normalizeImageParamsFromDefinitions } from './logicalRegistry';
import { getHiddenCapabilityKeys, getHiddenProviderParamDefinitions, renderGenerationParamSlot } from './registry';
import { generationParamTabs } from './tabs';
import type { GenerationParamTab } from './types';
import { readProviderParamState, getProviderParamStateKey } from './providerState';
import type { ProviderGenerationSurface, ProviderGenerationSurfaceContext, ProviderGenerationSurfacePatchContext, ProviderGenerationSurfacePayloadContext, ProviderGenerationSurfaceSnapshotContext } from './surfaceTypes';
import { buildOpenAiCompatibleRequestSurfacePayload, openAiCompatibleGenerationRequestSurface } from './requestSurface';

function createOpenAiTabStats(params: ImageParams, retryOffLabel: string): Record<GenerationParamTab, string> {
  return {
    frame: params.sizeMode === 'custom' ? `${params.width}×${params.height}` : params.sizeMode === 'preset' ? params.sizePreset : 'auto',
    render: [params.quality || 'omit', params.background || 'omit'].join(' · '),
    output: `${params.outputFormat}${params.stream ? ' · stream' : ''}`,
    service: params.rawJson.trim() ? 'raw JSON' : 'payload',
    retry: params.retryAttempts > 0 ? `${params.retryAttempts}× / ${params.retryDelaySeconds}s` : retryOffLabel
  };
}

export function getOpenAiCompatibleTabStats(params: ImageParams, retryOffLabel = 'off') {
  return createOpenAiTabStats(params, retryOffLabel);
}

export function buildOpenAiCompatibleSurfacePayload(params: ImageParams, provider: ProviderSettings, mode: WorkMode, providerMode?: ProviderGenerationModeDefinition | null): Record<string, unknown> {
  return buildOpenAiCompatibleRequestSurfacePayload(params, provider, mode, providerMode);
}

export function captureOpenAiCompatibleSurfaceParamsSnapshot(context: ProviderGenerationSurfaceSnapshotContext) {
  return openAiCompatibleGenerationRequestSurface.captureParamsSnapshot(context);
}

export const openAiCompatibleGenerationSurface: ProviderGenerationSurface = {
  id: 'openai-compatible.logical-params',
  kind: 'logical-params',
  getDefaultState: () => ({}),
  getStateKey: (provider) => getProviderParamStateKey(provider),
  readState: (params, provider) => readProviderParamState(params, provider, {}),
  normalizeState: () => ({}),
  normalizeParams: normalizeImageParamsFromDefinitions,
  getTabs: () => generationParamTabs,
  getInitialTab: () => 'frame',
  getTabStats: (context: ProviderGenerationSurfaceContext, labels?: { retryOff: string }) => createOpenAiTabStats(context.params, labels?.retryOff ?? 'off'),
  getHiddenSummary: (context: ProviderGenerationSurfacePatchContext) => ({
    capabilityKeys: getHiddenCapabilityKeys({ mode: context.mode, capabilityReport: context.capabilityReport }, capabilityOrder),
    paramLabelKeys: getHiddenProviderParamDefinitions(context).map(getGenerationParamPrimaryLabelKey)
  }),
  renderSlot: (slot, context) => renderGenerationParamSlot(slot, context),
  buildPayload: ({ params, provider, mode, providerMode }: ProviderGenerationSurfacePayloadContext) => buildOpenAiCompatibleSurfacePayload(params, provider, mode, providerMode),
  captureParamsSnapshot: captureOpenAiCompatibleSurfaceParamsSnapshot,
  captureProviderParamsSnapshot: (context) => openAiCompatibleGenerationRequestSurface.captureProviderParamsSnapshot(context),
  captureParameterSummary: (context) => openAiCompatibleGenerationRequestSurface.captureParameterSummary(context),
  restoreParamsFromSnapshot: (context) => openAiCompatibleGenerationRequestSurface.restoreParamsFromSnapshot(context)
};
