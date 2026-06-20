import { getProviderGenerationRequestSurface } from '../../entities/generation-params/requestSurface';
import type {
  AttachmentSummary,
  GenerationModel,
  GenerationProvider,
  GenerationRequestSnapshot,
  ImageParams,
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
  const { mode, params, provider, activeProvider, activeModel, payload, warnings, targetImage, referenceImages, mask, fallbackProviderLabel } = args;
  const surface = getProviderGenerationRequestSurface(provider);
  const snapshotContext = { params, provider, mode, payload };

  return {
    createdAt: Date.now(),
    mode,
    prompt: params.prompt.trim(),
    endpoint: mode === 'generate' ? provider.generationEndpoint : provider.editEndpoint,
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
