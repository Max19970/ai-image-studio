import type {
  ProviderAttachmentRole,
  ProviderGenerationModeDefinition
} from '../../domain/providerMode';

export type ProviderModeUiIntent = 'generate-like' | 'edit-like';

export interface ProviderModeAttachmentRequirements {
  allowedRoles: readonly ProviderAttachmentRole[];
  requiredRoles: readonly ProviderAttachmentRole[];
  allowsAnyAttachment: boolean;
  requiresAnyAttachment: boolean;
  allowsImageAttachments: boolean;
  allowsMask: boolean;
}

export function getProviderModeAttachmentRequirements(
  providerMode: ProviderGenerationModeDefinition
): ProviderModeAttachmentRequirements {
  const allowedRoles = providerMode.attachmentPolicy.allowedRoles;
  const requiredRoles = providerMode.attachmentPolicy.requiredRoles ?? [];

  return {
    allowedRoles,
    requiredRoles,
    allowsAnyAttachment: allowedRoles.length > 0,
    requiresAnyAttachment: requiredRoles.length > 0,
    allowsImageAttachments: allowedRoles.includes('targetImage') || allowedRoles.includes('referenceImage'),
    allowsMask: allowedRoles.includes('mask')
  };
}

export function getProviderModeUiIntent(providerMode: ProviderGenerationModeDefinition): ProviderModeUiIntent {
  const attachmentRequirements = getProviderModeAttachmentRequirements(providerMode);

  if (providerMode.submit.operation === 'edit') return 'edit-like';
  if (providerMode.submit.kind === 'multipart' && attachmentRequirements.allowsAnyAttachment) return 'edit-like';
  return 'generate-like';
}

export function isProviderModeGenerateLike(providerMode: ProviderGenerationModeDefinition): boolean {
  return getProviderModeUiIntent(providerMode) === 'generate-like';
}

export function isProviderModeEditLike(providerMode: ProviderGenerationModeDefinition): boolean {
  return getProviderModeUiIntent(providerMode) === 'edit-like';
}

export function getProviderModePromptPlaceholderKey(
  providerMode: ProviderGenerationModeDefinition,
  options: { compact?: boolean } = {}
): string {
  const intent = getProviderModeUiIntent(providerMode);
  if (intent === 'edit-like') {
    return options.compact ? 'composer.placeholder.editCompact' : 'composer.placeholder.edit';
  }
  return options.compact ? 'composer.placeholder.generateCompact' : 'composer.placeholder.generate';
}

export function getProviderModeSubmitActionLabelKey(providerMode: ProviderGenerationModeDefinition): string {
  return getProviderModeUiIntent(providerMode) === 'edit-like'
    ? 'composer.submitEdit'
    : 'composer.submitGenerate';
}
