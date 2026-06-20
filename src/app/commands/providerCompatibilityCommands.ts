import type { CreateAppCommandsArgs } from './appCommandTypes';
import type { ProviderGenerationModeId, ProviderAttachmentRole } from '../../domain/providerMode';
import type { StudioSettings } from '../../domain/studioSettings';
import type { ProviderCompatibilityChange } from '../../entities/provider/compatibility';
import {
  getProviderModeForAttachmentRole,
  sanitizeBatchDraftsForSettings,
  sanitizeProviderModeDraftForModel
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
  const result = sanitizeProviderModeDraftForModel({
    providerModeId: args.providerModeId,
    targetImage: args.targetImage,
    referenceImages: args.referenceImages,
    mask: args.mask
  }, settings, modelId);

  if (result.changed) {
    args.setProviderModeId(result.value.providerModeId);
    args.setTargetImage(result.value.targetImage);
    args.setReferenceImages(result.value.referenceImages);
    args.setMask(result.value.mask);
  }

  setCompatibilityNoticeForChanges(args, result.changes);
  return result;
}

export function setComposerDraftWithCompatibility(
  args: CreateAppCommandsArgs,
  draft: {
    providerModeId?: ProviderGenerationModeId;
    targetImage: File | null;
    referenceImages: File[];
    mask: File | null;
  }
) {
  const result = sanitizeProviderModeDraftForModel({
    providerModeId: draft.providerModeId ?? args.providerModeId,
    targetImage: draft.targetImage,
    referenceImages: draft.referenceImages,
    mask: draft.mask
  }, args.studioSettings, args.studioSettings.selectedModelId);

  args.setProviderModeId(result.value.providerModeId);
  args.setTargetImage(result.value.targetImage);
  args.setReferenceImages(result.value.referenceImages);
  args.setMask(result.value.mask);
  setCompatibilityNoticeForChanges(args, result.changes);
}

export function setComposerProviderModeWithCompatibility(args: CreateAppCommandsArgs, providerModeId: ProviderGenerationModeId) {
  setComposerDraftWithCompatibility(args, {
    providerModeId,
    targetImage: args.targetImage,
    referenceImages: args.referenceImages,
    mask: args.mask
  });
}

export function getComposerModeForAttachmentRole(args: CreateAppCommandsArgs, role: ProviderAttachmentRole): ProviderGenerationModeId {
  return getProviderModeForAttachmentRole(
    args.studioSettings,
    args.studioSettings.selectedModelId,
    args.providerModeId,
    role
  ).id;
}

export function sanitizeBatchDraftsAfterSettingsChange(args: CreateAppCommandsArgs, settings: StudioSettings) {
  args.setBatchDrafts((prev) => sanitizeBatchDraftsForSettings(prev, settings));
}
