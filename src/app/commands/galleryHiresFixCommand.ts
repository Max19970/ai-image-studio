import { cloneParams } from '../../domain/generationSnapshots';
import type { GeneratedImage, GenerationRequestSnapshot, GenerationTask } from '../../domain/generationTask';
import type { ImageParams } from '../../domain/imageParams';
import { comfyUiHiresFixModeId } from '../../entities/generation-params/comfyui/modes';
import { readComfyUiParamState, toComfyUiProviderParamState } from '../../entities/generation-params/comfyui/state';
import { getProviderGenerationRequestSurfaceById } from '../../entities/generation-params/requestSurface';
import { writeProviderParamState } from '../../entities/generation-params/providerState';
import { normalizeSelectedModel, providerContextForModel } from '../../entities/studio-settings';
import type { ProviderSettings } from '../../domain/providerSettings';
import type { CreateAppCommandsArgs } from './appCommandTypes';

interface ImageDimensions {
  width: number;
  height: number;
}

function getSnapshotForHiresFix(task: GenerationTask, image: GeneratedImage): GenerationRequestSnapshot {
  return image.request ?? task.request;
}

function fileExtensionFromMime(type: string): string {
  if (type.includes('jpeg')) return 'jpg';
  if (type.includes('webp')) return 'webp';
  return 'png';
}

async function imageSrcToFile(src: string, fallbackName: string): Promise<File> {
  const response = await fetch(src);
  if (!response.ok) throw new Error(`Cannot load generated image: HTTP ${response.status}`);
  const blob = await response.blob();
  const type = blob.type || 'image/png';
  return new File([blob], `${fallbackName}.${fileExtensionFromMime(type)}`, { type });
}

async function readImageDimensions(src: string): Promise<ImageDimensions | null> {
  if (typeof Image === 'undefined') return null;
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth || image.width, height: image.naturalHeight || image.height });
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

export function findFirstComfyUiModelId(args: Pick<CreateAppCommandsArgs, 'studioSettings'>): string | null {
  const providerById = new Map(args.studioSettings.providers.map((provider) => [provider.id, provider]));
  const model = args.studioSettings.models.find((item) => providerById.get(item.providerId)?.adapterId === 'comfyui');
  return model?.id ?? null;
}

export function restoreParamsForHiresFix(args: {
  previous: ImageParams;
  snapshot: GenerationRequestSnapshot;
  sourceSize: ImageDimensions | null;
  provider: ProviderSettings;
}): ImageParams {
  let restored = cloneParams(args.previous);
  try {
    restored = getProviderGenerationRequestSurfaceById(args.snapshot.surfaceId).restoreParamsFromSnapshot({ previous: restored, snapshot: args.snapshot });
  } catch {
    restored = { ...restored, prompt: args.snapshot.prompt };
  }

  const comfyState = readComfyUiParamState(restored, args.provider);
  const sourceWidth = args.sourceSize?.width ?? comfyState.hiresInputWidth;
  const sourceHeight = args.sourceSize?.height ?? comfyState.hiresInputHeight;
  return writeProviderParamState(restored, args.provider, toComfyUiProviderParamState({
    ...comfyState,
    hiresScale: comfyState.hiresScale || 2,
    hiresInputWidth: sourceWidth,
    hiresInputHeight: sourceHeight
  }));
}

export async function startGalleryHiresFixCommand(args: CreateAppCommandsArgs, task: GenerationTask, image?: GeneratedImage | null): Promise<void> {
  const activeImage = image ?? task.images[0] ?? null;
  if (!activeImage) return;

  const comfyModelId = findFirstComfyUiModelId(args);
  if (!comfyModelId) {
    args.setCompatibilityNotice(args.t('gallery.hiresFixNoComfy'));
    return;
  }

  try {
    const { provider } = providerContextForModel(args.studioSettings, comfyModelId);
    const [targetFile, sourceSize] = await Promise.all([
      imageSrcToFile(activeImage.src, `hires-fix-${activeImage.id}`),
      readImageDimensions(activeImage.src)
    ]);
    const snapshot = getSnapshotForHiresFix(task, activeImage);
    const restoredParams = restoreParamsForHiresFix({ previous: args.params, snapshot, sourceSize, provider });

    args.setStudioSettings((prev) => normalizeSelectedModel({ ...prev, selectedModelId: comfyModelId }));
    args.setProviderModeId(comfyUiHiresFixModeId);
    args.setParams(restoredParams);
    args.setTargetImage(targetFile);
    args.setReferenceImages([]);
    args.setMask(null);
    args.setBatchComposerOpen(false);
    args.setWorkspaceTab('images');
    args.setSelectedTaskId(null);
    args.setSelectedImageId(null);
    args.setCompatibilityNotice(null);
  } catch {
    args.setCompatibilityNotice(args.t('gallery.hiresFixImageLoadFailed'));
  }
}
