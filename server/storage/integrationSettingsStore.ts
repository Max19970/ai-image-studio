import type { IntegrationConfigPatch, IntegrationRuntimeConfig } from '../integrations/types';
import {
  currentDocumentKey,
  integrationSettingsBucket,
  loadAppDocument,
  saveAppDocument,
  type AppDocumentStorageStats
} from './appDocumentStore';
import {
  applyIntegrationSecretPatch,
  cloneIntegrationSettingsDocument,
  createEmptyIntegrationSettingsDocument,
  getIntegrationSettingsRecord,
  normalizeIntegrationSettingsDocument,
  normalizeSecretRecord,
  sanitizeIntegrationPublicValues,
  toIntegrationRuntimeConfig
} from './integration-settings/integrationSettingsCodecs';
import type {
  IntegrationSettingsDocument,
  IntegrationSettingsLoadResult,
  IntegrationSettingsRecord,
  IntegrationSettingsSaveResult
} from './integration-settings/types';

export type {
  IntegrationPublicConfig,
  IntegrationSecretPublicState,
  IntegrationSecretRecord,
  IntegrationSettingsDocument,
  IntegrationSettingsLoadResult,
  IntegrationSettingsRecord,
  IntegrationSettingsSaveResult
} from './integration-settings/types';
export { integrationSettingsDocumentVersion } from './integration-settings/types';
export {
  createEmptyIntegrationSettingsDocument,
  getIntegrationSettingsRecord,
  maskSecretValue,
  sanitizeIntegrationConfigMapForClient,
  sanitizeIntegrationPublicValues,
  sanitizeIntegrationRecordForClient,
  sanitizeIntegrationSettingsForClient,
  toIntegrationRuntimeConfig
} from './integration-settings/integrationSettingsCodecs';

export function loadIntegrationSettings(): IntegrationSettingsLoadResult {
  const loaded = loadAppDocument<IntegrationSettingsDocument>(
    integrationSettingsBucket,
    currentDocumentKey,
    createEmptyIntegrationSettingsDocument()
  );

  return {
    value: normalizeIntegrationSettingsDocument(loaded.value),
    storage: loaded.storage
  };
}

export function saveIntegrationSettings(document: IntegrationSettingsDocument): AppDocumentStorageStats {
  return saveAppDocument(integrationSettingsBucket, currentDocumentKey, normalizeIntegrationSettingsDocument(document));
}

export function loadIntegrationRuntimeConfig(id: string): IntegrationRuntimeConfig {
  const record = getIntegrationSettingsRecord(loadIntegrationSettings().value, id);
  return toIntegrationRuntimeConfig(record);
}

export function patchIntegrationSettings(
  id: string,
  patch: IntegrationConfigPatch,
  secretDefinitions: readonly string[] = []
): IntegrationSettingsSaveResult {
  const loaded = loadIntegrationSettings();
  const document = cloneIntegrationSettingsDocument(loaded.value);
  const existing = getIntegrationSettingsRecord(document, id);
  const record = createPatchedIntegrationRecord(existing, patch, secretDefinitions, Date.now());

  document.integrations[id] = record;
  const storage = saveIntegrationSettings(document);
  return { document, record, storage };
}

function createPatchedIntegrationRecord(
  existing: IntegrationSettingsRecord,
  patch: IntegrationConfigPatch,
  secretDefinitions: readonly string[],
  now: number
): IntegrationSettingsRecord {
  const record: IntegrationSettingsRecord = {
    ...existing,
    values: { ...existing.values },
    secrets: { ...existing.secrets },
    createdAt: existing.createdAt ?? now,
    updatedAt: now
  };

  if (typeof patch.enabled === 'boolean') record.enabled = patch.enabled;
  if (patch.values && typeof patch.values === 'object') {
    record.values = sanitizeIntegrationPublicValues({ ...record.values, ...patch.values });
  }

  applyIntegrationSecretPatch(record, patch.secretPatch, now);
  for (const secretId of secretDefinitions) {
    if (record.secrets[secretId]) record.secrets[secretId] = normalizeSecretRecord(record.secrets[secretId]) ?? record.secrets[secretId];
  }
  return record;
}
