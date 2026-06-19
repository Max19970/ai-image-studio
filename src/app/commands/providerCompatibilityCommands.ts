import type { CreateAppCommandsArgs } from './appCommandTypes';
import type { StudioSettings } from '../../domain/studioSettings';
import type { WorkMode } from '../../domain/workMode';
import type { ProviderCompatibilityChange } from '../../entities/provider/compatibility';
import {
  sanitizeBatchDraftsForSettings,
  sanitizeGenerationDraftForModel,
  sanitizeGenerationDraftForProviderCapabilities,
  getProviderRuntimeCapabilitiesForModel
} from '../../entities/provider/compatibility';

export function compatibilityNoticeForChanges(
  t: CreateAppCommandsArgs['t'],
  changes: readonly ProviderCompatibilityChange[]
): string | null {
  if (changes.length === 0) return null;
  return t('composer.compatibilityAdjustedRequest');
}

export function setCompatibilityNoticeForChanges(
  args: CreateAppCommandsArgs,
  changes: readonly ProviderCompatibilityChange[]
) {
  args.setCompatibilityNotice(compatibilityNoticeForChanges(args.t, changes));
}

export function applyComposerCompatibilityForModel(args: CreateAppCommandsArgs, settings: StudioSettings, modelId: string) {
  const result = sanitizeGenerationDraftForModel({
    mode: args.mode,
    targetImage: args.targetImage,
    referenceImages: args.referenceImages,
    mask: args.mask
  }, settings, modelId);

  if (result.changed) {
    args.setMode(result.value.mode);
    args.setTargetImage(result.value.targetImage);
    args.setReferenceImages(result.value.referenceImages);
    args.setMask(result.value.mask);
  }

  setCompatibilityNoticeForChanges(args, result.changes);
  return result;
}

export function setComposerDraftWithCompatibility(
  args: CreateAppCommandsArgs,
  draft: { mode: WorkMode; targetImage: File | null; referenceImages: File[]; mask: File | null }
) {
  const result = sanitizeGenerationDraftForModel(draft, args.studioSettings, args.studioSettings.selectedModelId);
  args.setMode(result.value.mode);
  args.setTargetImage(result.value.targetImage);
  args.setReferenceImages(result.value.referenceImages);
  args.setMask(result.value.mask);
  setCompatibilityNoticeForChanges(args, result.changes);
}

export function setComposerModeWithCompatibility(args: CreateAppCommandsArgs, mode: WorkMode) {
  const capabilities = getProviderRuntimeCapabilitiesForModel(args.studioSettings, args.studioSettings.selectedModelId);
  const result = sanitizeGenerationDraftForProviderCapabilities({
    mode,
    targetImage: args.targetImage,
    referenceImages: args.referenceImages,
    mask: args.mask
  }, capabilities);

  args.setMode(result.value.mode);
  if (result.changed) {
    args.setTargetImage(result.value.targetImage);
    args.setReferenceImages(result.value.referenceImages);
    args.setMask(result.value.mask);
  }
  setCompatibilityNoticeForChanges(args, result.changes);
}

export function sanitizeBatchDraftsAfterSettingsChange(args: CreateAppCommandsArgs, settings: StudioSettings) {
  args.setBatchDrafts((prev) => sanitizeBatchDraftsForSettings(prev, settings));
}
