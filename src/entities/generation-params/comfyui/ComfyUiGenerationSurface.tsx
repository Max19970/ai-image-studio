import { normalizeImageParamsFromDefinitions } from '../logicalRegistry';
import { renderGenerationParamSlot } from '../registry';
import type { GenerationParamSlot, GenerationParamTab, GenerationParamTabDefinition } from '../types';
import type { ProviderGenerationSurface, ProviderGenerationSurfaceContext, ProviderGenerationSurfacePatchContext } from '../surfaceTypes';
import {
  COMFYUI_SURFACE_ID,
  buildComfyUiPayload,
  createComfyUiParameterSummary,
  defaultComfyUiParamState,
  normalizeComfyUiParamState,
  readComfyUiParamState,
  toComfyUiProviderParamState
} from './state';
import { comfyUiGenerationRequestSurface } from './requestSurface';
import {
  COMFYUI_MAX_SEED,
  HiresScaleField,
  HiresUpscaleModeField,
  HiresUpscaleModelField,
  LoraStackField,
  NumberField,
  SeedModeField,
  SelectField,
  TextField,
  comfyUiSamplerOptions,
  comfyUiSchedulerOptions
} from './ComfyUiSurfaceFields';

const COMFYUI_HIRES_FIX_MODE_ID = 'comfyui.hires-fix';

function isHiresFixMode(context: Pick<ProviderGenerationSurfaceContext, 'providerMode'>): boolean {
  return context.providerMode.id === COMFYUI_HIRES_FIX_MODE_ID;
}

const comfyUiTextToImageTabs: readonly GenerationParamTabDefinition[] = [
  { id: 'frame', slot: 'composer/parameters/frame', labelKey: 'params.comfy.frame', hintKey: 'params.comfy.frameHint' },
  { id: 'render', slot: 'composer/parameters/render', labelKey: 'params.comfy.sampling', hintKey: 'params.comfy.samplingHint' },
  { id: 'service', slot: 'composer/parameters/service', labelKey: 'params.comfy.workflow', hintKey: 'params.comfy.workflowHint' },
  { id: 'retry', slot: 'composer/parameters/retry', labelKey: 'params.retry', hintKey: 'params.retryHint', panelClassKey: 'retryTabPanel' }
];

const comfyUiHiresFixTabs: readonly GenerationParamTabDefinition[] = [
  { id: 'frame', slot: 'composer/parameters/frame', labelKey: 'params.comfy.targetFrame', hintKey: 'params.comfy.targetFrameHint' },
  { id: 'output', slot: 'composer/parameters/output', labelKey: 'params.comfy.hiresUpscale', hintKey: 'params.comfy.hiresUpscaleHint' },
  { id: 'render', slot: 'composer/parameters/render', labelKey: 'params.comfy.sampling', hintKey: 'params.comfy.samplingHint' },
  { id: 'service', slot: 'composer/parameters/service', labelKey: 'params.comfy.workflow', hintKey: 'params.comfy.workflowHint' },
  { id: 'retry', slot: 'composer/parameters/retry', labelKey: 'params.retry', hintKey: 'params.retryHint', panelClassKey: 'retryTabPanel' }
];

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
    <TextField key="filename" context={context} labelKey="params.comfy.filenamePrefix" descriptionKey="params.comfy.filenamePrefix.description" stateKey="filenamePrefix" />,
    <LoraStackField key="loras" context={context} />
  ];
}

function renderComfyUiHiresUpscaleSlot(context: ProviderGenerationSurfacePatchContext) {
  const state = readComfyUiParamState(context.params, context.provider);
  return [
    <HiresUpscaleModeField key="hiresUpscaleMode" context={context} />,
    state.hiresUpscaleMode === 'ai' ? <HiresUpscaleModelField key="hiresUpscaleModel" context={context} /> : null
  ].filter(Boolean);
}

function renderComfyUiSlot(slot: GenerationParamSlot, context: ProviderGenerationSurfacePatchContext) {
  if (slot === 'composer/parameters/frame') return renderComfyUiFrameSlot(context);
  if (slot === 'composer/parameters/render') return renderComfyUiRenderSlot(context);
  if (slot === 'composer/parameters/output') return isHiresFixMode(context) ? renderComfyUiHiresUpscaleSlot(context) : [];
  if (slot === 'composer/parameters/service') return renderComfyUiServiceSlot(context);
  if (slot === 'composer/parameters/retry') return renderGenerationParamSlot(slot, context);
  return [];
}

function tabStats(context: ProviderGenerationSurfaceContext, retryOffLabel: string): Record<GenerationParamTab, string> {
  const state = readComfyUiParamState(context.params, context.provider);
  const hiresFix = isHiresFixMode(context);
  return {
    frame: hiresFix ? `${state.hiresScale}×` : `${state.width}×${state.height} · ${state.batchSize}x`,
    render: `${state.steps} steps · CFG ${state.cfg}`,
    output: hiresFix ? (state.hiresUpscaleMode === 'ai' ? (state.hiresUpscaleModel || 'AI upscale') : 'Latent upscale') : 'workflow',
    service: state.loras.filter((lora) => lora.enabled).length ? `${state.loras.filter((lora) => lora.enabled).length} LoRA` : 'no LoRA',
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
  getTabs: (context) => isHiresFixMode(context) ? comfyUiHiresFixTabs : comfyUiTextToImageTabs,
  getInitialTab: () => 'frame',
  getTabStats: (context, labels) => tabStats(context, labels?.retryOff ?? 'off'),
  getHiddenSummary: () => ({ capabilityKeys: [], paramLabelKeys: [] }),
  renderSlot: renderComfyUiSlot,
  buildPayload: ({ params, provider, providerMode }) => buildComfyUiPayload(params, provider, providerMode),
  captureParamsSnapshot: (context) => comfyUiGenerationRequestSurface.captureParamsSnapshot(context),
  captureProviderParamsSnapshot: (context) => comfyUiGenerationRequestSurface.captureProviderParamsSnapshot(context),
  captureParameterSummary: (context) => createComfyUiParameterSummary(readComfyUiParamState(context.params, context.provider), context.provider, context.providerMode),
  restoreParamsFromSnapshot: (context) => comfyUiGenerationRequestSurface.restoreParamsFromSnapshot(context)
};
