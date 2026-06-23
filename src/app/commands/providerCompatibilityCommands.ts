import type { BatchCompatibilityCommandDeps, ComposerCompatibilityCommandDeps } from './appCommandTypes';
import type { ProviderGenerationModeId, ProviderAttachmentRole } from '../../domain/providerMode';
import type { StudioSettings } from '../../domain/studioSettings';
import type { ProviderCompatibilityChange } from '../../entities/provider/compatibility';
import {
  getProviderModeForAttachmentRole,
  sanitizeBatchDraftsForSettings,
  sanitizeProviderModeDraftForModel
} from '../../entities/provider/compatibility';

export function compatibilityNoticeForChanges(
  t: ComposerCompatibilityCommandDeps['t'],
  changes: readonly ProviderCompatibilityChange[]
): string | null {
  if (changes.length === 0) return null;
  return t('composer.compatibilityAdjustedRequest');
}

export function setCompatibilityNoticeForChanges(
  args: Pick<ComposerCompatibilityCommandDeps, 't' | 'setCompatibilityNotice'>,
  changes: readonly ProviderCompatibilityChange[]
) {
  args.setCompatibilityNotice(compatibilityNoticeForChanges(args.t, changes));
}

export function applyComposerCompatibilityForModel(args: ComposerCompatibilityCommandDeps, settings: StudioSettings, modelId: string) {
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
  args: ComposerCompatibilityCommandDeps,
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

export function setComposerProviderModeWithCompatibility(args: ComposerCompatibilityCommandDeps, providerModeId: ProviderGenerationModeId) {
  setComposerDraftWithCompatibility(args, {
    providerModeId,
    targetImage: args.targetImage,
    referenceImages: args.referenceImages,
    mask: args.mask
  });
}

export function getComposerModeForAttachmentRole(args: ComposerCompatibilityCommandDeps, role: ProviderAttachmentRole): ProviderGenerationModeId {
  return getProviderModeForAttachmentRole(
    args.studioSettings,
    args.studioSettings.selectedModelId,
    args.providerModeId,
    role
  ).id;
}

export function sanitizeBatchDraftsAfterSettingsChange(args: BatchCompatibilityCommandDeps, settings: StudioSettings) {
  args.setBatchDrafts((prev) => sanitizeBatchDraftsForSettings(prev, settings));
}
