import type { ProviderGenerationModeDefinition } from '../../../domain/providerMode';
import { COMFYUI_SURFACE_ID } from './state';

export const comfyUiTextToImageModeId = 'comfyui.text-to-image';
export const comfyUiHiresFixModeId = 'comfyui.hires-fix';
export const comfyUiDetailSurfaceId = 'comfyui.workflow-summary';

const comfyUiImageSizeConstraint = {
  min: 64,
  max: 4096,
  multipleOf: 8,
  snap: 'floor',
  infoKey: 'providerModes.comfyui.sizeRules'
} as const;

const comfyUiHiresScaleConstraint = {
  min: 0.1,
  max: 8,
  step: 0.01,
  snap: 'floor'
} as const;

export const comfyUiTextToImageMode: ProviderGenerationModeDefinition = {
  id: comfyUiTextToImageModeId,
  labelKey: 'providerModes.comfyui.textToImage.label',
  descriptionKey: 'providerModes.comfyui.textToImage.description',
  isDefault: true,
  legacyWorkMode: 'generate',
  attachmentPolicy: {
    allowedRoles: [],
    requiredRoles: [],
    maxCounts: {},
    clearOnSwitch: 'all-disallowed'
  },
  generationSurfaceId: COMFYUI_SURFACE_ID,
  detailSurfaceId: comfyUiDetailSurfaceId,
  submit: { kind: 'json', operation: 'provider-submit', path: '/api/provider/submit' },
  valueConstraints: { imageSize: comfyUiImageSizeConstraint }
};

export const comfyUiHiresFixMode: ProviderGenerationModeDefinition = {
  id: comfyUiHiresFixModeId,
  labelKey: 'providerModes.comfyui.hiresFix.label',
  descriptionKey: 'providerModes.comfyui.hiresFix.description',
  attachmentPolicy: {
    allowedRoles: ['targetImage'],
    requiredRoles: ['targetImage'],
    maxCounts: { targetImage: 1 },
    clearOnSwitch: 'all-disallowed'
  },
  generationSurfaceId: COMFYUI_SURFACE_ID,
  detailSurfaceId: comfyUiDetailSurfaceId,
  submit: { kind: 'multipart', operation: 'provider-submit', path: '/api/provider/submit' },
  valueConstraints: {
    imageSize: comfyUiImageSizeConstraint,
    hiresScale: comfyUiHiresScaleConstraint
  }
};

export const comfyUiGenerationModes = [
  comfyUiTextToImageMode,
  comfyUiHiresFixMode
] as const satisfies readonly ProviderGenerationModeDefinition[];

export function isComfyUiHiresFixMode(providerModeId: string | null | undefined): boolean {
  return providerModeId === comfyUiHiresFixModeId;
}
