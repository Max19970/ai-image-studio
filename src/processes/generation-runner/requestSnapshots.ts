import { getProviderGenerationRequestSurface } from '../../entities/generation-params/requestSurface';
import { resolveProviderGenerationModeFromProviderSettings } from '../../entities/provider/modeResolution';
import type {
  AttachmentSummary,
  GenerationModel,
  GenerationProvider,
  GenerationRequestSnapshot,
  ImageParams,
  ProviderGenerationModeDefinition,
  ProviderSettings,
  WorkMode
} from '../../domain/types';

export function summarizeFile(role: AttachmentSummary['role'], file: File): AttachmentSummary {
  return {
    role,
    name: file.name,
    size: file.size,
    type: file.type,
    previewUrl: URL.createObjectURL(file)
  };
}

export function summarizeAttachments(targetImage: File | null, referenceImages: File[], mask: File | null): AttachmentSummary[] {
  const attachments: AttachmentSummary[] = [];
  if (targetImage) attachments.push(summarizeFile('target', targetImage));
  referenceImages.forEach((file) => attachments.push(summarizeFile('reference', file)));
  if (mask) attachments.push(summarizeFile('mask', mask));
  return attachments;
}

export function captureRequestSnapshot(args: {
  mode: WorkMode;
  providerMode: ProviderGenerationModeDefinition;
  providerModeLabel: string;
  params: ImageParams;
  provider: ProviderSettings;
  activeProvider: GenerationProvider | null;
  activeModel: GenerationModel | null;
  payload: Record<string, unknown>;
  warnings: string[];
  targetImage: File | null;
  referenceImages: File[];
  mask: File | null;
  fallbackProviderLabel: string;
}): GenerationRequestSnapshot {
  const {
    mode,
    providerMode,
    providerModeLabel,
    params,
    provider,
    activeProvider,
    activeModel,
    payload,
    warnings,
    targetImage,
    referenceImages,
    mask,
    fallbackProviderLabel
  } = args;

  const activeProviderMode = providerMode ?? resolveProviderGenerationModeFromProviderSettings(provider, null, mode);
  const activeProviderModeLabel = providerModeLabel || activeProviderMode.id;
  const surface = getProviderGenerationRequestSurface(provider);
  const snapshotContext = { params, provider, mode, providerMode: activeProviderMode, payload };
  const endpoint = activeProviderMode.submit.path
    ?? (activeProviderMode.submit.operation === 'edit' ? provider.editEndpoint : provider.generationEndpoint);

  return {
    createdAt: Date.now(),
    mode,
    providerModeId: activeProviderMode.id,
    providerModeLabel: activeProviderModeLabel,
    detailSurfaceId: activeProviderMode.detailSurfaceId,
    transportOperation: activeProviderMode.submit.operation,
    prompt: params.prompt.trim(),
    endpoint,
    providerLabel: activeProvider?.name || provider.generationEndpoint || provider.editEndpoint || fallbackProviderLabel,
    providerAdapterId: provider.adapterId,
    model: provider.modelId,
    modelLabel: activeModel?.name || provider.modelId,
    payload,
    warnings,
    surfaceId: surface.id,
    providerParams: surface.captureProviderParamsSnapshot(snapshotContext),
    parameterSummary: surface.captureParameterSummary(snapshotContext),
    attachments: summarizeAttachments(targetImage, referenceImages, mask),
    params: surface.captureParamsSnapshot(snapshotContext)
  };
}
