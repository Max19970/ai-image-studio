import type { WorkMode } from '../../../domain/workMode';
import type { ProviderGenerationModeDefinition } from '../../../domain/providerMode';

const openAiCompatibleImageSizeConstraint = {
  min: 1,
  max: 4096,
  multipleOf: 8,
  snap: 'floor',
  infoKey: 'providerModes.openaiCompatible.sizeRules'
} as const;

export const openAiCompatibleGenerationSurfaceId = 'openai-compatible.logical-params';
export const openAiCompatibleDetailSurfaceId = 'openai-compatible.request-snapshot';

export const openAiCompatibleImageGenerateModeId = 'openai-compatible.image-generate';
export const openAiCompatibleImageEditModeId = 'openai-compatible.image-edit';

export const openAiCompatibleImageGenerateMode: ProviderGenerationModeDefinition = {
  id: openAiCompatibleImageGenerateModeId,
  labelKey: 'providerModes.openaiCompatible.imageGenerate.label',
  descriptionKey: 'providerModes.openaiCompatible.imageGenerate.description',
  isDefault: true,
  legacyWorkMode: 'generate',
  attachmentPolicy: {
    allowedRoles: [],
    requiredRoles: [],
    maxCounts: {},
    clearOnSwitch: 'all-disallowed'
  },
  generationSurfaceId: openAiCompatibleGenerationSurfaceId,
  detailSurfaceId: openAiCompatibleDetailSurfaceId,
  submit: { kind: 'json', operation: 'generate', path: '/api/provider/submit' },
  valueConstraints: { imageSize: openAiCompatibleImageSizeConstraint }
};

export const openAiCompatibleImageEditMode: ProviderGenerationModeDefinition = {
  id: openAiCompatibleImageEditModeId,
  labelKey: 'providerModes.openaiCompatible.imageEdit.label',
  descriptionKey: 'providerModes.openaiCompatible.imageEdit.description',
  legacyWorkMode: 'edit',
  attachmentPolicy: {
    allowedRoles: ['targetImage', 'referenceImage', 'mask'],
    requiredRoles: [],
    maxCounts: { targetImage: 1, mask: 1 },
    clearOnSwitch: 'all-disallowed'
  },
  generationSurfaceId: openAiCompatibleGenerationSurfaceId,
  detailSurfaceId: openAiCompatibleDetailSurfaceId,
  submit: { kind: 'multipart', operation: 'edit', path: '/api/provider/submit' },
  valueConstraints: { imageSize: openAiCompatibleImageSizeConstraint }
};

export const openAiCompatibleGenerationModes = [
  openAiCompatibleImageGenerateMode,
  openAiCompatibleImageEditMode
] as const satisfies readonly ProviderGenerationModeDefinition[];

export function isOpenAiCompatibleProviderMode(
  providerMode: ProviderGenerationModeDefinition | null | undefined
): providerMode is typeof openAiCompatibleGenerationModes[number] {
  return Boolean(providerMode && openAiCompatibleGenerationModes.some((mode) => mode.id === providerMode.id));
}

export function resolveOpenAiCompatibleProviderMode(
  providerMode: ProviderGenerationModeDefinition | null | undefined,
  legacyMode: WorkMode
): ProviderGenerationModeDefinition {
  if (isOpenAiCompatibleProviderMode(providerMode)) return providerMode;
  return legacyMode === 'edit' ? openAiCompatibleImageEditMode : openAiCompatibleImageGenerateMode;
}

export function resolveOpenAiCompatibleLegacyMode(
  providerMode: ProviderGenerationModeDefinition | null | undefined,
  fallbackMode: WorkMode
): WorkMode {
  return resolveOpenAiCompatibleProviderMode(providerMode, fallbackMode).legacyWorkMode ?? fallbackMode;
}
