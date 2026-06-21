export type JsonObject = Record<string, unknown>;

export type GenerationTaskAssetMode = 'full' | 'thumbnail' | 'metadata';

export interface GenerationTaskHistoryLoadOptions {
  limit?: number;
  offset?: number;
  assetMode?: GenerationTaskAssetMode;
}

export interface StoredImageReference {
  documentKey: string;
  taskId: string;
  imageId: string;
  batchItemId: string | null;
  batchItemIndex: number | null;
  imageIndex: number;
  assetKind: 'full' | 'thumbnail';
  imageKind: string;
  format: string;
  createdAt: number;
  bytes: number;
  document: JsonObject;
}

export interface TaskRow {
  id: string;
  document_key: string;
  kind: string;
  status: string;
  gallery_path: string;
  created_at: number;
  updated_at: number;
  image_count: number;
  batch_item_count: number;
}

export interface AssetRow {
  id: string;
  task_id: string;
  batch_item_id: string | null;
  document_key: string;
  image_id: string;
  image_index: number;
  kind: string;
  format: string;
  created_at: number;
  bytes: number;
}

export interface GenerationTaskHistoryStorageStats {
  backend: string;
  schemaVersion: number;
  dbPath: string;
  updatedAt: number | null;
  taskCount: number;
  assetCount: number;
  thumbnailCount: number;
  compressedBytes: number;
  encryptedBytes: number;
  legacyFallbackUsed?: boolean;
}


export interface GenerationTaskStorageBucketDiagnostics {
  bucket: string;
  documentCount: number;
  compressedBytes: number;
  encryptedBytes: number;
  updatedAt: number | null;
}

export interface GenerationTaskStorageIntegritySummary {
  orphanAssetRows: number;
  missingTaskDocuments: number;
  orphanTaskDocuments: number;
  missingAssetDocuments: number;
  orphanAssetDocuments: number;
}

export interface GenerationTaskStorageIntegrityIssue {
  kind: string;
  count: number;
}

export interface GenerationTaskStorageDiagnostics {
  backend: string;
  schemaVersion: number;
  dbPath: string;
  generatedAt: number;
  history: GenerationTaskHistoryStorageStats;
  taskRows: number;
  assetRows: number;
  fullAssetRows: number;
  thumbnailAssetRows: number;
  declaredImageBytes: number;
  taskStatusBreakdown: Record<string, number>;
  taskKindBreakdown: Record<string, number>;
  buckets: GenerationTaskStorageBucketDiagnostics[];
  integrity: GenerationTaskStorageIntegritySummary;
}

export interface GenerationTaskStorageAudit {
  ok: boolean;
  diagnostics: GenerationTaskStorageDiagnostics;
  issues: GenerationTaskStorageIntegrityIssue[];
}
