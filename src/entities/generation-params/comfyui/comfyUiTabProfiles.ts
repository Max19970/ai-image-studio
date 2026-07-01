import type { GenerationParamTabDefinition } from '../types';

export const COMFYUI_HIRES_FIX_MODE_ID = 'comfyui.hires-fix';

export const comfyUiTabProfiles: Record<string, readonly GenerationParamTabDefinition[]> = {
  textToImage: [
    { id: 'frame', slot: 'composer/parameters/frame', labelKey: 'params.comfy.frame', hintKey: 'params.comfy.frameHint' },
    { id: 'render', slot: 'composer/parameters/render', labelKey: 'params.comfy.sampling', hintKey: 'params.comfy.samplingHint' },
    { id: 'service', slot: 'composer/parameters/service', labelKey: 'params.comfy.workflow', hintKey: 'params.comfy.workflowHint' },
    { id: 'retry', slot: 'composer/parameters/retry', labelKey: 'params.retry', hintKey: 'params.retryHint', panelClassKey: 'retryTabPanel' }
  ],
  hiresFix: [
    { id: 'frame', slot: 'composer/parameters/frame', labelKey: 'params.comfy.targetFrame', hintKey: 'params.comfy.targetFrameHint' },
    { id: 'output', slot: 'composer/parameters/output', labelKey: 'params.comfy.hiresUpscale', hintKey: 'params.comfy.hiresUpscaleHint' },
    { id: 'render', slot: 'composer/parameters/render', labelKey: 'params.comfy.sampling', hintKey: 'params.comfy.samplingHint' },
    { id: 'service', slot: 'composer/parameters/service', labelKey: 'params.comfy.workflow', hintKey: 'params.comfy.workflowHint' },
    { id: 'retry', slot: 'composer/parameters/retry', labelKey: 'params.retry', hintKey: 'params.retryHint', panelClassKey: 'retryTabPanel' }
  ]
};

export function getComfyUiTabProfile(providerModeId: string) {
  return providerModeId === COMFYUI_HIRES_FIX_MODE_ID ? comfyUiTabProfiles.hiresFix : comfyUiTabProfiles.textToImage;
}
