import type { AppDocumentStorageStats } from '../appDocumentStore';

export const integrationSettingsDocumentVersion = 1;

export interface IntegrationSecretRecord {
  value: string;
  updatedAt: number;
}

export interface IntegrationSettingsRecord {
  id: string;
  enabled: boolean;
  values: Record<string, unknown>;
  secrets: Record<string, IntegrationSecretRecord>;
  createdAt: number | null;
  updatedAt: number | null;
}

export interface IntegrationSettingsDocument {
  version: typeof integrationSettingsDocumentVersion;
  integrations: Record<string, IntegrationSettingsRecord>;
}

export interface IntegrationSecretPublicState {
  configured: boolean;
  preview?: string;
  updatedAt?: number | null;
}

export interface IntegrationPublicConfig {
  id: string;
  enabled: boolean;
  values: Record<string, unknown>;
  secrets: Record<string, IntegrationSecretPublicState>;
  createdAt: number | null;
  updatedAt: number | null;
}

export interface IntegrationSettingsLoadResult {
  value: IntegrationSettingsDocument;
  storage: AppDocumentStorageStats;
}

export interface IntegrationSettingsSaveResult {
  document: IntegrationSettingsDocument;
  record: IntegrationSettingsRecord;
  storage: AppDocumentStorageStats;
}
