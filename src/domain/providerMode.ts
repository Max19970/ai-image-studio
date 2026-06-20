import type { WorkMode } from './workMode';

export type ProviderGenerationModeId = string;

export const providerAttachmentRoles = ['targetImage', 'referenceImage', 'mask'] as const;
export type ProviderAttachmentRole = typeof providerAttachmentRoles[number];

export type ProviderAttachmentClearOnSwitch = 'all-disallowed' | 'none' | readonly ProviderAttachmentRole[];

export interface ProviderAttachmentPolicy {
  allowedRoles: readonly ProviderAttachmentRole[];
  requiredRoles?: readonly ProviderAttachmentRole[];
  maxCounts?: Partial<Record<ProviderAttachmentRole, number>>;
  clearOnSwitch: ProviderAttachmentClearOnSwitch;
}

export type ProviderSubmitTransportKind = 'json' | 'multipart';
export type ProviderSubmitTransportOperation = 'generate' | 'edit' | 'provider-submit';

export interface ProviderSubmitTransportDefinition {
  kind: ProviderSubmitTransportKind;
  operation: ProviderSubmitTransportOperation;
  path?: string;
}

export interface ProviderGenerationModeDefinition {
  id: ProviderGenerationModeId;
  labelKey: string;
  descriptionKey?: string;
  isDefault?: boolean;
  legacyWorkMode?: WorkMode;
  attachmentPolicy: ProviderAttachmentPolicy;
  generationSurfaceId: string;
  detailSurfaceId: string;
  submit: ProviderSubmitTransportDefinition;
}
