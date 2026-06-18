import {
  generationTaskAssetBucket,
  generationTaskDocumentBucket,
  getStorageDb,
  storageBackend,
  storageDbPath
} from '../encryptedStore';
import { generationTaskAssetsTableName, generationTasksTableName, storageDocumentsTableName, storageSchemaVersion } from '../schema';
import { getGenerationTaskHistoryStats } from './generationTaskStats';
import type {
  GenerationTaskStorageAudit,
  GenerationTaskStorageBucketDiagnostics,
  GenerationTaskStorageDiagnostics,
  GenerationTaskStorageIntegrityIssue,
  GenerationTaskStorageIntegritySummary
} from './types';

function numberValue(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function scalar(sql: string, ...values: unknown[]): number {
  const row = getStorageDb().prepare(sql).get(...values) as { value?: unknown } | undefined;
  return numberValue(row?.value);
}

function groupCounts(sql: string, ...values: unknown[]): Record<string, number> {
  const rows = getStorageDb().prepare(sql).all(...values) as Array<{ key?: unknown; value?: unknown }>;
  return Object.fromEntries(rows.map((row) => [String(row.key ?? 'unknown'), numberValue(row.value)]));
}

function bucketDiagnostics(): GenerationTaskStorageBucketDiagnostics[] {
  const rows = getStorageDb().prepare(`
    SELECT
      bucket,
      COUNT(*) AS document_count,
      COALESCE(SUM(compressed_bytes), 0) AS compressed_bytes,
      COALESCE(SUM(encrypted_bytes), 0) AS encrypted_bytes,
      MAX(updated_at) AS updated_at
    FROM ${storageDocumentsTableName}
    GROUP BY bucket
    ORDER BY bucket ASC
  `).all() as Array<{
    bucket?: string;
    document_count?: number;
    compressed_bytes?: number;
    encrypted_bytes?: number;
    updated_at?: number;
  }>;

  return rows.map((row) => ({
    bucket: row.bucket ?? 'unknown',
    documentCount: numberValue(row.document_count),
    compressedBytes: numberValue(row.compressed_bytes),
    encryptedBytes: numberValue(row.encrypted_bytes),
    updatedAt: row.updated_at ?? null
  }));
}

function integritySummary(): GenerationTaskStorageIntegritySummary {
  return {
    orphanAssetRows: scalar(`
      SELECT COUNT(*) AS value
      FROM ${generationTaskAssetsTableName} asset
      LEFT JOIN ${generationTasksTableName} task ON task.id = asset.task_id
      WHERE task.id IS NULL
    `),
    missingTaskDocuments: scalar(`
      SELECT COUNT(*) AS value
      FROM ${generationTasksTableName} task
      LEFT JOIN ${storageDocumentsTableName} document ON document.bucket = ? AND document.key = task.document_key
      WHERE document.key IS NULL
    `, generationTaskDocumentBucket),
    orphanTaskDocuments: scalar(`
      SELECT COUNT(*) AS value
      FROM ${storageDocumentsTableName} document
      LEFT JOIN ${generationTasksTableName} task ON task.document_key = document.key
      WHERE document.bucket = ? AND task.id IS NULL
    `, generationTaskDocumentBucket),
    missingAssetDocuments: scalar(`
      SELECT COUNT(*) AS value
      FROM ${generationTaskAssetsTableName} asset
      LEFT JOIN ${storageDocumentsTableName} document ON document.bucket = ? AND document.key = asset.document_key
      WHERE document.key IS NULL
    `, generationTaskAssetBucket),
    orphanAssetDocuments: scalar(`
      SELECT COUNT(*) AS value
      FROM ${storageDocumentsTableName} document
      LEFT JOIN ${generationTaskAssetsTableName} asset ON asset.document_key = document.key
      WHERE document.bucket = ? AND asset.id IS NULL
    `, generationTaskAssetBucket)
  };
}

function integrityIssues(summary: GenerationTaskStorageIntegritySummary): GenerationTaskStorageIntegrityIssue[] {
  return Object.entries(summary)
    .filter(([, count]) => count > 0)
    .map(([kind, count]) => ({ kind, count }));
}

export function getGenerationTaskStorageDiagnostics(): GenerationTaskStorageDiagnostics {
  const integrity = integritySummary();
  return {
    backend: storageBackend,
    schemaVersion: storageSchemaVersion,
    dbPath: storageDbPath,
    generatedAt: Date.now(),
    history: getGenerationTaskHistoryStats(),
    taskRows: scalar(`SELECT COUNT(*) AS value FROM ${generationTasksTableName}`),
    assetRows: scalar(`SELECT COUNT(*) AS value FROM ${generationTaskAssetsTableName}`),
    fullAssetRows: scalar(`SELECT COUNT(*) AS value FROM ${generationTaskAssetsTableName} WHERE kind = 'full'`),
    thumbnailAssetRows: scalar(`SELECT COUNT(*) AS value FROM ${generationTaskAssetsTableName} WHERE kind = 'thumbnail'`),
    declaredImageBytes: scalar(`SELECT COALESCE(SUM(bytes), 0) AS value FROM ${generationTaskAssetsTableName}`),
    taskStatusBreakdown: groupCounts(`SELECT status AS key, COUNT(*) AS value FROM ${generationTasksTableName} GROUP BY status ORDER BY status ASC`),
    taskKindBreakdown: groupCounts(`SELECT kind AS key, COUNT(*) AS value FROM ${generationTasksTableName} GROUP BY kind ORDER BY kind ASC`),
    buckets: bucketDiagnostics(),
    integrity
  };
}

export function auditGenerationTaskStorageDocuments(): GenerationTaskStorageAudit {
  const diagnostics = getGenerationTaskStorageDiagnostics();
  const issues = integrityIssues(diagnostics.integrity);
  return { ok: issues.length === 0, diagnostics, issues };
}
