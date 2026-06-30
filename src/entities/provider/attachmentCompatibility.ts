import type { BatchComposerDraft } from '../../domain/generationTask';
import type { ProviderGenerationModeDefinition, ProviderGenerationModeId, ProviderAttachmentPolicy, ProviderAttachmentRole } from '../../domain/providerMode';
import type { StudioSettings } from '../../domain/studioSettings';
import type { WorkMode } from '../../domain/workMode';
import {
  findProviderGenerationModeForAttachmentRole,
  getDefaultProviderGenerationMode,
  normalizeProviderGenerationMode,
  resolveProviderGenerationMode
} from './modeResolution';
import type {
  ProviderCompatibilityChange,
  ProviderCompatibilityResult,
  ProviderModeDraftCompatibilityShape
} from './compatibilityTypes';
import { uniqueCompatibilityChanges } from './compatibilityTypes';

function roleAllowed(policy: ProviderAttachmentPolicy, role: ProviderAttachmentRole): boolean {
  return policy.allowedRoles.includes(role);
}

function shouldClearRole(policy: ProviderAttachmentPolicy, role: ProviderAttachmentRole): boolean {
  if (!roleAllowed(policy, role)) return true;
  if (Array.isArray(policy.clearOnSwitch)) return policy.clearOnSwitch.includes(role);
  return false;
}

function hasAnyAttachment(draft: Pick<ProviderModeDraftCompatibilityShape, 'targetImage' | 'referenceImages' | 'mask'>): boolean {
  return Boolean(draft.targetImage) || draft.referenceImages.length > 0 || Boolean(draft.mask);
}

function hasRequiredRole(draft: Pick<ProviderModeDraftCompatibilityShape, 'targetImage' | 'referenceImages' | 'mask'>, role: ProviderAttachmentRole): boolean {
  if (role === 'targetImage') return Boolean(draft.targetImage);
  if (role === 'referenceImage') return draft.referenceImages.length > 0;
  return Boolean(draft.mask);
}

export function providerModeAllowsAttachmentRole(providerMode: ProviderGenerationModeDefinition, role: ProviderAttachmentRole): boolean {
  return roleAllowed(providerMode.attachmentPolicy, role);
}

export function providerModeAllowsImageAttachments(providerMode: ProviderGenerationModeDefinition): boolean {
  return providerModeAllowsAttachmentRole(providerMode, 'targetImage') || providerModeAllowsAttachmentRole(providerMode, 'referenceImage');
}

export function providerModeAllowsMask(providerMode: ProviderGenerationModeDefinition): boolean {
  return providerModeAllowsAttachmentRole(providerMode, 'mask');
}

export function addImageFilesToProviderModeDraft<T extends ProviderModeDraftCompatibilityShape>(
  draft: T,
  providerMode: ProviderGenerationModeDefinition,
  files: File[]
): T {
  if (files.length === 0) return draft;

  const policy = providerMode.attachmentPolicy;
  const allowsTarget = roleAllowed(policy, 'targetImage') && policy.maxCounts?.targetImage !== 0;
  const allowsReferences = roleAllowed(policy, 'referenceImage') && policy.maxCounts?.referenceImage !== 0;
  if (!allowsTarget && !allowsReferences) return draft;

  const remaining = [...files];
  const requiresTarget = Boolean(policy.requiredRoles?.includes('targetImage'));
  const next: ProviderModeDraftCompatibilityShape = {
    providerModeId: providerMode.id,
    targetImage: draft.targetImage,
    referenceImages: draft.referenceImages,
    mask: draft.mask
  };

  if (allowsTarget && (!allowsReferences || (requiresTarget && !next.targetImage))) {
    next.targetImage = remaining.shift() ?? next.targetImage;
  } else if (!allowsTarget) {
    next.targetImage = null;
  }

  if (allowsReferences) {
    const maxReferenceImages = policy.maxCounts?.referenceImage ?? 16;
    next.referenceImages = [...next.referenceImages, ...remaining].slice(0, maxReferenceImages);
  } else {
    next.referenceImages = [];
  }

  return { ...draft, ...next };
}

function applyProviderModeAttachmentPolicy<T extends ProviderModeDraftCompatibilityShape>(
  draft: T,
  providerMode: ProviderGenerationModeDefinition,
  normalizedProviderModeId = providerMode.id
): ProviderCompatibilityResult<T> {
  const changes: ProviderCompatibilityChange[] = [];
  const policy = providerMode.attachmentPolicy;
  const next: ProviderModeDraftCompatibilityShape = {
    providerModeId: normalizedProviderModeId,
    targetImage: draft.targetImage,
    referenceImages: draft.referenceImages,
    mask: draft.mask
  };

  if (draft.providerModeId !== normalizedProviderModeId) changes.push('providerMode');

  const maxTargetImages = policy.maxCounts?.targetImage;
  const maxReferenceImages = policy.maxCounts?.referenceImage;
  const maxMasks = policy.maxCounts?.mask;

  if (shouldClearRole(policy, 'targetImage') || maxTargetImages === 0) {
    if (next.targetImage) {
      next.targetImage = null;
      changes.push('imageAttachments');
    }
  }

  if (shouldClearRole(policy, 'referenceImage') || maxReferenceImages === 0) {
    if (next.referenceImages.length > 0) {
      next.referenceImages = [];
      changes.push('imageAttachments');
    }
  } else if (typeof maxReferenceImages === 'number' && next.referenceImages.length > maxReferenceImages) {
    next.referenceImages = next.referenceImages.slice(0, maxReferenceImages);
    changes.push('imageAttachments');
  }

  if (shouldClearRole(policy, 'mask') || maxMasks === 0) {
    if (next.mask) {
      next.mask = null;
      changes.push('mask');
    }
  }

  const normalizedChanges = uniqueCompatibilityChanges(changes);
  if (normalizedChanges.length === 0) return { value: draft, changed: false, changes: [] };
  return { value: { ...draft, ...next }, changed: true, changes: normalizedChanges };
}

export function sanitizeProviderModeDraftForModel<T extends ProviderModeDraftCompatibilityShape>(
  draft: T,
  settings: StudioSettings,
  modelId: string,
  legacyMode?: WorkMode | null
): ProviderCompatibilityResult<T> {
  const resolution = resolveProviderGenerationMode({
    settings,
    modelId,
    providerModeId: draft.providerModeId,
    legacyMode
  });

  return applyProviderModeAttachmentPolicy(
    draft,
    resolution.activeMode,
    resolution.activeMode.id
  );
}

export function sanitizeBatchDraftForSettings(
  draft: BatchComposerDraft,
  settings: StudioSettings
): ProviderCompatibilityResult<BatchComposerDraft> {
  return sanitizeProviderModeDraftForModel(draft, settings, draft.selectedModelId);
}

export function sanitizeBatchDraftsForSettings(drafts: BatchComposerDraft[], settings: StudioSettings): BatchComposerDraft[] {
  return drafts.map((draft) => sanitizeBatchDraftForSettings(draft, settings).value);
}

export function getProviderModeForAttachmentRole(
  settings: StudioSettings,
  modelId: string,
  currentProviderModeId: ProviderGenerationModeId,
  role: ProviderAttachmentRole
): ProviderGenerationModeDefinition {
  const resolution = resolveProviderGenerationMode({ settings, modelId, providerModeId: currentProviderModeId });
  return findProviderGenerationModeForAttachmentRole(resolution.adapter, role, currentProviderModeId)
    ?? normalizeProviderGenerationMode(resolution.adapter, currentProviderModeId)
    ?? getDefaultProviderGenerationMode(resolution.adapter);
}

export function getMissingRequiredAttachmentRoles(
  draft: Pick<ProviderModeDraftCompatibilityShape, 'targetImage' | 'referenceImages' | 'mask'>,
  providerMode: ProviderGenerationModeDefinition
): ProviderAttachmentRole[] {
  return (providerMode.attachmentPolicy.requiredRoles ?? []).filter((role) => !hasRequiredRole(draft, role));
}

export function hasProviderModeRequiredAttachments(
  draft: Pick<ProviderModeDraftCompatibilityShape, 'targetImage' | 'referenceImages' | 'mask'>,
  providerMode: ProviderGenerationModeDefinition
): boolean {
  const missingRequired = getMissingRequiredAttachmentRoles(draft, providerMode);
  if (missingRequired.length > 0) return false;

  const acceptsAttachments = providerMode.attachmentPolicy.allowedRoles.length > 0;
  if (providerMode.submit.kind === 'multipart' && acceptsAttachments) return hasAnyAttachment(draft);

  return true;
}

export function getProviderModeAttachmentStatusText(args: {
  draft: Pick<ProviderModeDraftCompatibilityShape, 'targetImage' | 'referenceImages' | 'mask'>;
  providerMode: ProviderGenerationModeDefinition;
  t: (key: string, vars?: Record<string, string | number | boolean | null | undefined>) => string;
}): string | null {
  const { draft, providerMode, t } = args;
  const missingRequired = getMissingRequiredAttachmentRoles(draft, providerMode);
  if (missingRequired.includes('targetImage')) return t('composer.providerModeNeedsTarget');
  if (missingRequired.includes('referenceImage')) return t('composer.providerModeNeedsReference');
  if (missingRequired.includes('mask')) return t('composer.providerModeNeedsMask');

  const acceptsAttachments = providerMode.attachmentPolicy.allowedRoles.length > 0;
  if (providerMode.submit.kind === 'multipart' && acceptsAttachments && !hasAnyAttachment(draft)) {
    return t('composer.providerModeNeedsImage');
  }

  return null;
}

export function hasProviderCompatibilityChanges(changes: readonly ProviderCompatibilityChange[]): boolean {
  return changes.length > 0;
}
