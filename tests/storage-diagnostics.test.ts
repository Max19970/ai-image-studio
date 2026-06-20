import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createGenerationTaskHistoryFixture } from '../scripts/storage-fixtures.mjs';

test('generation task storage diagnostics report archive scale and audit broken assets', async () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'image-studio-storage-diagnostics-'));
  process.env.IMAGE_STUDIO_DB_PATH = path.join(tempDir, 'storage.sqlite');
  process.env.IMAGE_STUDIO_STORAGE_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  let closeDb: (() => void) | null = null;
  try {
    const cacheKey = Date.now();
    const taskStore = await import(`../server/storage/generationTaskStore.ts?diag=${cacheKey}`);
    const encryptedStore = await import('../server/storage/encryptedStore.ts');
    closeDb = encryptedStore.closeStorageDbForTests;
    const tasks = createGenerationTaskHistoryFixture({ taskCount: 4, imagesPerTask: 2, batchItemsPerTask: 1, batchImagesPerItem: 1, imageBytes: 256 });

    taskStore.saveGenerationTaskHistoryDocuments(tasks);

    const diagnostics = taskStore.getGenerationTaskStorageDiagnostics();
    assert.equal(diagnostics.taskRows, 4);
    assert.equal(diagnostics.fullAssetRows, 12);
    assert.equal(diagnostics.thumbnailAssetRows, 12);
    assert.equal(diagnostics.assetRows, 24);
    assert.equal(diagnostics.taskKindBreakdown.batch, 4);
    assert.ok(diagnostics.taskStatusBreakdown.succeeded >= 3);
    assert.equal(diagnostics.integrity.missingAssetDocuments, 0);
    assert.ok(diagnostics.buckets.some((bucket: { bucket: string }) => bucket.bucket === 'generation-task.v2'));
    assert.ok(diagnostics.buckets.some((bucket: { bucket: string }) => bucket.bucket === 'generation-task-asset.v2'));

    const cleanAudit = taskStore.auditGenerationTaskStorageDocuments();
    assert.equal(cleanAudit.ok, true);
    assert.deepEqual(cleanAudit.issues, []);

    const metadata = taskStore.loadGenerationTaskHistoryDocuments({ assetMode: 'metadata' }).tasks as any[];
    encryptedStore.deleteEncryptedDocument(encryptedStore.generationTaskAssetBucket, metadata[0].images[0].storageAssetKey);

    const brokenAudit = taskStore.auditGenerationTaskStorageDocuments();
    assert.equal(brokenAudit.ok, false);
    assert.equal(brokenAudit.diagnostics.integrity.missingAssetDocuments, 1);
    assert.ok(brokenAudit.issues.some((issue: { kind: string; count: number }) => issue.kind === 'missingAssetDocuments' && issue.count === 1));
  } finally {
    closeDb?.();
    rmSync(tempDir, { recursive: true, force: true });
  }
});
