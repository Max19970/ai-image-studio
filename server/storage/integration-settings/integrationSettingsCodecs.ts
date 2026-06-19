import type {
  IntegrationRuntimeConfig,
  IntegrationSecretPatch
} from '../../integrations/types';
import {
  integrationSettingsDocumentVersion,
  type IntegrationPublicConfig,
  type IntegrationSecretPublicState,
  type IntegrationSecretRecord,
  type IntegrationSettingsDocument,
  type IntegrationSettingsRecord
} from './types';

const secretLikeValueKeyPattern = /(token|secret|password|authorization|api[-_]?key|apikey)/i;
const emptyDocument: IntegrationSettingsDocument = {
  version: integrationSettingsDocumentVersion,
  integrations: {}
};

export function createEmptyIntegrationSettingsDocument(): IntegrationSettingsDocument {
  return cloneIntegrationSettingsDocument(emptyDocument);
}

export function sanitizeIntegrationSettingsForClient(
  id: string,
  document: IntegrationSettingsDocument,
  secretDefinitions: readonly string[] = []
): IntegrationPublicConfig {
  const record = getIntegrationSettingsRecord(document, id);
  return sanitizeIntegrationRecordForClient(record, secretDefinitions);
}

export function sanitizeIntegrationRecordForClient(
  record: IntegrationSettingsRecord,
  secretDefinitions: readonly string[] = []
): IntegrationPublicConfig {
  const secretIds = new Set([...secretDefinitions, ...Object.keys(record.secrets)]);
  const secrets: Record<string, IntegrationSecretPublicState> = {};

  for (const secretId of [...secretIds].sort()) {
    const secret = normalizeSecretRecord(record.secrets[secretId]);
    secrets[secretId] = secret
      ? { configured: true, preview: maskSecretValue(secret.value), updatedAt: secret.updatedAt }
      : { configured: false, updatedAt: null };
  }

  return {
    id: record.id,
    enabled: record.enabled,
    values: sanitizeIntegrationPublicValues(record.values),
    secrets,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

export function sanitizeIntegrationConfigMapForClient(
  document: IntegrationSettingsDocument,
  secretDefinitionsByIntegration: Record<string, readonly string[]> = {}
): Record<string, IntegrationPublicConfig> {
  return Object.fromEntries(
    Object.entries(document.integrations).map(([id, record]) => [
      id,
      sanitizeIntegrationRecordForClient(record, secretDefinitionsByIntegration[id] ?? [])
    ])
  );
}

export function toIntegrationRuntimeConfig(record: IntegrationSettingsRecord): IntegrationRuntimeConfig {
  const secrets = Object.fromEntries(
    Object.entries(record.secrets)
      .map(([id, secret]) => [id, normalizeSecretRecord(secret)?.value])
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0)
  );

  return {
    id: record.id,
    enabled: record.enabled,
    values: sanitizeIntegrationPublicValues(record.values),
    secrets
  };
}

export function getIntegrationSettingsRecord(
  document: IntegrationSettingsDocument,
  id: string
): IntegrationSettingsRecord {
  const normalized = normalizeIntegrationSettingsDocument(document);
  return normalized.integrations[id] ?? createDefaultIntegrationSettingsRecord(id);
}

export function createDefaultIntegrationSettingsRecord(id: string): IntegrationSettingsRecord {
  return { id, enabled: false, values: {}, secrets: {}, createdAt: null, updatedAt: null };
}

export function applyIntegrationSecretPatch(
  record: IntegrationSettingsRecord,
  patch: IntegrationSecretPatch | undefined,
  now: number
): void {
  if (!patch?.secrets || typeof patch.secrets !== 'object') return;

  for (const [secretId, secretPatch] of Object.entries(patch.secrets)) {
    if (!secretId || !secretPatch || typeof secretPatch !== 'object') continue;
    if (secretPatch.clear) {
      delete record.secrets[secretId];
      continue;
    }

    if (typeof secretPatch.value !== 'string') continue;
    const value = secretPatch.value.trim();
    if (value) record.secrets[secretId] = { value, updatedAt: now };
  }
}

export function maskSecretValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.length <= 8) return '••••';
  return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`;
}

export function sanitizeIntegrationPublicValues(values: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!values || typeof values !== 'object' || Array.isArray(values)) return {};
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(values)) {
    if (!key || secretLikeValueKeyPattern.test(key)) continue;
    const sanitizedValue = sanitizeJsonLikeValue(value);
    if (sanitizedValue !== undefined) result[key] = sanitizedValue;
  }
  return result;
}

export function normalizeIntegrationSettingsDocument(value: unknown): IntegrationSettingsDocument {
  if (!value || typeof value !== 'object') return createEmptyIntegrationSettingsDocument();
  const source = value as Partial<IntegrationSettingsDocument>;
  const integrationsSource = source.integrations && typeof source.integrations === 'object' ? source.integrations : {};
  const integrations: Record<string, IntegrationSettingsRecord> = {};

  for (const [id, record] of Object.entries(integrationsSource)) {
    if (!id || !record || typeof record !== 'object') continue;
    integrations[id] = normalizeIntegrationSettingsRecord(id, record as Partial<IntegrationSettingsRecord>);
  }

  return { version: integrationSettingsDocumentVersion, integrations };
}

export function normalizeSecretRecord(value: unknown): IntegrationSecretRecord | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Partial<IntegrationSecretRecord>;
  if (typeof source.value !== 'string' || !source.value.trim()) return null;
  return {
    value: source.value.trim(),
    updatedAt: normalizeTimestamp(source.updatedAt) ?? Date.now()
  };
}

export function cloneIntegrationSettingsDocument(document: IntegrationSettingsDocument): IntegrationSettingsDocument {
  return {
    version: integrationSettingsDocumentVersion,
    integrations: Object.fromEntries(
      Object.entries(document.integrations).map(([id, record]) => [
        id,
        {
          ...record,
          values: { ...record.values },
          secrets: Object.fromEntries(
            Object.entries(record.secrets).map(([secretId, secret]) => [secretId, { ...secret }])
          )
        }
      ])
    )
  };
}

function sanitizeJsonLikeValue(value: unknown): unknown {
  if (value === null) return null;
  if (['string', 'number', 'boolean'].includes(typeof value)) return value;
  if (Array.isArray(value)) return value.map((item) => sanitizeJsonLikeValue(item)).filter((item) => item !== undefined);
  if (typeof value !== 'object') return undefined;

  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (!key || secretLikeValueKeyPattern.test(key)) continue;
    const sanitizedChild = sanitizeJsonLikeValue(child);
    if (sanitizedChild !== undefined) result[key] = sanitizedChild;
  }
  return result;
}

function normalizeIntegrationSettingsRecord(id: string, value: Partial<IntegrationSettingsRecord>): IntegrationSettingsRecord {
  const secrets: Record<string, IntegrationSecretRecord> = {};
  if (value.secrets && typeof value.secrets === 'object') {
    for (const [secretId, secret] of Object.entries(value.secrets)) {
      const normalized = normalizeSecretRecord(secret);
      if (secretId && normalized) secrets[secretId] = normalized;
    }
  }

  return {
    id: typeof value.id === 'string' && value.id.trim() ? value.id : id,
    enabled: value.enabled === true,
    values: sanitizeIntegrationPublicValues(value.values),
    secrets,
    createdAt: normalizeTimestamp(value.createdAt),
    updatedAt: normalizeTimestamp(value.updatedAt)
  };
}

function normalizeTimestamp(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}
