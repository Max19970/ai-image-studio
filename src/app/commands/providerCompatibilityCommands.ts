import type { BatchCompatibilityCommandDeps, ComposerCompatibilityCommandDeps } from './appCommandTypes';
import type { ProviderGenerationModeId, ProviderAttachmentRole } from '../../domain/providerMode';
import type { StudioSettings } from '../../domain/studioSettings';
import type { ProviderCompatibilityChange } from '../../entities/provider/compatibilityTypes';
import {
  getProviderModeForAttachmentRole,
  sanitizeBatchDraftsForSettings,
  sanitizeProviderModeDraftForModel
} from '../../entities/provider/attachmentCompatibility';

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

function replaceComposerCompatibilityRequest(args: ComposerCompatibilityCommandDeps, request: {
  providerModeId: ProviderGenerationModeId;
  selectedModelId: string;
  targetImage: File | null;
  referenceImages: File[];
  mask: File | null;
}, changes: readonly ProviderCompatibilityChange[]) {
  args.replaceActiveComposerRequest({
    providerModeId: request.providerModeId,
    params: args.params,
    selectedModelId: request.selectedModelId,
    targetImage: request.targetImage,
    referenceImages: request.referenceImages,
    mask: request.mask
  }, compatibilityNoticeForChanges(args.t, changes));
}

export function applyComposerCompatibilityForModel(args: ComposerCompatibilityCommandDeps, settings: StudioSettings, modelId: string) {
  const result = sanitizeProviderModeDraftForModel({
    providerModeId: args.providerModeId,
    targetImage: args.targetImage,
    referenceImages: args.referenceImages,
    mask: args.mask
  }, settings, modelId);

  replaceComposerCompatibilityRequest(args, {
    ...result.value,
    selectedModelId: modelId
  }, result.changes);
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
  const selectedModelId = args.studioSettings.selectedModelId;
  const result = sanitizeProviderModeDraftForModel({
    providerModeId: draft.providerModeId ?? args.providerModeId,
    targetImage: draft.targetImage,
    referenceImages: draft.referenceImages,
    mask: draft.mask
  }, args.studioSettings, selectedModelId);

  replaceComposerCompatibilityRequest(args, {
    ...result.value,
    selectedModelId
  }, result.changes);
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
