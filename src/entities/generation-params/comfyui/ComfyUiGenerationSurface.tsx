import { normalizeImageParamsFromDefinitions } from '../logicalRegistry';
import { renderGenerationParamSlot } from '../registry';
import {
  mergeGenerationTabs,
  mergeGenerationTabStats,
  renderGenerationExtensionSlot
} from '../extensionTypes';
import type { GenerationParamSlot, GenerationParamTab } from '../types';
import type { ProviderGenerationSurface, ProviderGenerationSurfaceContext, ProviderGenerationSurfacePatchContext } from '../surfaceTypes';
import {
  COMFYUI_SURFACE_ID,
  defaultComfyUiParamState,
  normalizeComfyUiParamState,
  readComfyUiParamState
} from './state';
import { toComfyUiProviderParamState } from './stateSerializers';
import { buildComfyUiPayload } from './payload';
import { createComfyUiParameterSummaryFromParams } from './summary';
import { comfyUiGenerationRequestSurface } from './requestSurface';
import { comfyUiGenerationExtensions } from './extensions/registry';
import {
  COMFYUI_MAX_SEED,
  HiresScaleField,
  HiresUpscaleModeField,
  HiresUpscaleModelField,
  NumberField,
  SeedModeField,
  SelectField,
  TextField,
  comfyUiSamplerOptions,
  comfyUiSchedulerOptions
} from './ComfyUiSurfaceFields';
import { COMFYUI_HIRES_FIX_MODE_ID, getComfyUiTabProfile } from './comfyUiTabProfiles';

function isHiresFixMode(context: Pick<ProviderGenerationSurfaceContext, 'providerMode'>): boolean {
  return context.providerMode.id === COMFYUI_HIRES_FIX_MODE_ID;
}

function getComfyUiBaseTabs(context: ProviderGenerationSurfaceContext) {
  return getComfyUiTabProfile(context.providerMode.id);
}

function renderComfyUiFrameSlot(context: ProviderGenerationSurfacePatchContext) {
  const hiresFix = isHiresFixMode(context);
  return [
    hiresFix ? <HiresScaleField key="hiresScale" context={context} /> : <NumberField key="width" context={context} labelKey="params.comfy.width" descriptionKey="params.comfy.width.description" stateKey="width" min={64} max={4096} step={1} />,
    hiresFix ? null : <NumberField key="height" context={context} labelKey="params.comfy.height" descriptionKey="params.comfy.height.description" stateKey="height" min={64} max={4096} step={1} />,
    hiresFix ? null : <NumberField key="batchSize" context={context} labelKey="params.comfy.batchSize" descriptionKey="params.comfy.batchSize.description" stateKey="batchSize" min={1} max={16} step={1} />
  ].filter(Boolean);
}

function renderComfyUiRenderSlot(context: ProviderGenerationSurfacePatchContext) {
  const state = readComfyUiParamState(context.params, context.provider);
  return [
    <NumberField key="steps" context={context} labelKey="params.comfy.steps" descriptionKey="params.comfy.steps.description" stateKey="steps" min={1} max={150} step={1} />,
    <NumberField key="cfg" context={context} labelKey="params.comfy.cfg" descriptionKey="params.comfy.cfg.description" stateKey="cfg" min={0} max={30} step={0.1} />,
    <SelectField key="sampler" context={context} labelKey="params.comfy.sampler" descriptionKey="params.comfy.sampler.description" stateKey="samplerName" options={comfyUiSamplerOptions} />,
    <SelectField key="scheduler" context={context} labelKey="params.comfy.scheduler" descriptionKey="params.comfy.scheduler.description" stateKey="scheduler" options={comfyUiSchedulerOptions} />,
    <SeedModeField key="seedMode" context={context} />,
    state.seedMode === 'fixed' ? <NumberField key="seed" context={context} labelKey="params.comfy.seed" descriptionKey="params.comfy.seed.description" stateKey="seed" min={0} max={COMFYUI_MAX_SEED} step={1} /> : null,
    <NumberField key="denoise" context={context} labelKey="params.comfy.denoise" descriptionKey="params.comfy.denoise.description" stateKey="denoise" min={0} max={1} step={0.01} />
  ].filter(Boolean);
}

function renderComfyUiServiceSlot(context: ProviderGenerationSurfacePatchContext) {
  return [
    <TextField key="negative" context={context} labelKey="params.comfy.negativePrompt" descriptionKey="params.comfy.negativePrompt.description" stateKey="negativePrompt" multiline />,
    <TextField key="filename" context={context} labelKey="params.comfy.filenamePrefix" descriptionKey="params.comfy.filenamePrefix.description" stateKey="filenamePrefix" />
  ];
}

function renderComfyUiHiresUpscaleSlot(context: ProviderGenerationSurfacePatchContext) {
  const state = readComfyUiParamState(context.params, context.provider);
  return [
    <HiresUpscaleModeField key="hiresUpscaleMode" context={context} />,
    state.hiresUpscaleMode === 'ai' ? <HiresUpscaleModelField key="hiresUpscaleModel" context={context} /> : null
  ].filter(Boolean);
}

function renderComfyUiBaseSlot(slot: GenerationParamSlot, context: ProviderGenerationSurfacePatchContext) {
  if (slot === 'composer/parameters/frame') return renderComfyUiFrameSlot(context);
  if (slot === 'composer/parameters/render') return renderComfyUiRenderSlot(context);
  if (slot === 'composer/parameters/output') return isHiresFixMode(context) ? renderComfyUiHiresUpscaleSlot(context) : [];
  if (slot === 'composer/parameters/service') return renderComfyUiServiceSlot(context);
  if (slot === 'composer/parameters/retry') return renderGenerationParamSlot(slot, context);
  return [];
}

function renderComfyUiSlot(slot: GenerationParamSlot, context: ProviderGenerationSurfacePatchContext) {
  return [
    ...renderComfyUiBaseSlot(slot, context),
    ...renderGenerationExtensionSlot(slot, comfyUiGenerationExtensions, context)
  ];
}

function baseTabStats(context: ProviderGenerationSurfaceContext, retryOffLabel: string): Record<GenerationParamTab, string> {
  const state = readComfyUiParamState(context.params, context.provider);
  const hiresFix = isHiresFixMode(context);
  return {
    frame: hiresFix ? `${state.hiresScale}×` : `${state.width}×${state.height} · ${state.batchSize}x`,
    render: `${state.steps} steps · CFG ${state.cfg}`,
    output: hiresFix ? (state.hiresUpscaleMode === 'ai' ? (state.hiresUpscaleModel || 'AI upscale') : 'Latent upscale') : 'workflow',
    service: 'workflow',
    retry: context.params.retryAttempts > 0 ? `${context.params.retryAttempts}× / ${context.params.retryDelaySeconds}s` : retryOffLabel
  };
}

export const comfyUiGenerationSurface: ProviderGenerationSurface = {
  id: COMFYUI_SURFACE_ID,
  kind: 'provider-owned',
  getDefaultState: () => toComfyUiProviderParamState(defaultComfyUiParamState),
  getStateKey: () => 'comfyui',
  readState: (params, provider) => toComfyUiProviderParamState(readComfyUiParamState(params, provider)),
  normalizeState: (value) => toComfyUiProviderParamState(normalizeComfyUiParamState(value)),
  normalizeParams: normalizeImageParamsFromDefinitions,
  getTabs: (context) => mergeGenerationTabs(getComfyUiBaseTabs(context), comfyUiGenerationExtensions, context),
  getInitialTab: () => 'frame',
  getTabStats: (context, labels) => mergeGenerationTabStats(baseTabStats(context, labels?.retryOff ?? 'off'), comfyUiGenerationExtensions, context),
  getHiddenSummary: () => ({ capabilityKeys: [], paramLabelKeys: [] }),
  renderSlot: renderComfyUiSlot,
  buildPayload: ({ params, provider, mode, providerMode }) => buildComfyUiPayload(params, provider, providerMode, mode),
  captureParamsSnapshot: (context) => comfyUiGenerationRequestSurface.captureParamsSnapshot(context),
  captureProviderParamsSnapshot: (context) => comfyUiGenerationRequestSurface.captureProviderParamsSnapshot(context),
  captureParameterSummary: (context) => createComfyUiParameterSummaryFromParams(context.params, context.provider, context.providerMode, context.mode, context.payload),
  restoreParamsFromSnapshot: (context) => comfyUiGenerationRequestSurface.restoreParamsFromSnapshot(context)
};
