import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

test('production runtime retention policy reads and normalizes encrypted studio settings', async () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'image-studio-runtime-policy-'));
  const originalDbPath = process.env.IMAGE_STUDIO_DB_PATH;
  const originalStorageKey = process.env.IMAGE_STUDIO_STORAGE_KEY;
  const originalStorageKeyFile = process.env.IMAGE_STUDIO_STORAGE_KEY_FILE;
  process.env.IMAGE_STUDIO_DB_PATH = path.join(tempDir, 'storage.sqlite');
  process.env.IMAGE_STUDIO_STORAGE_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  delete process.env.IMAGE_STUDIO_STORAGE_KEY_FILE;

  const appDocuments = await import('../server/storage/appDocumentStore.ts');
  const policyModule = await import(`../server/processes/generation-task-runtime/runtimeRetentionPolicy.ts?policy=${Date.now()}`);

  try {
    const descriptor = appDocuments.appDocumentBuckets.studioSettings;
    appDocuments.saveAppDocument(descriptor.bucket, descriptor.documentKey, { maxStoredGenerationTasks: 12001 });
    assert.equal(await policyModule.defaultRuntimeTaskRetentionPolicy.getCompletedTaskLimit(), 10000);

    appDocuments.saveAppDocument(descriptor.bucket, descriptor.documentKey, { maxStoredGenerationTasks: 0 });
    assert.equal(await policyModule.defaultRuntimeTaskRetentionPolicy.getCompletedTaskLimit(), 1);
  } finally {
    const encryptedStore = await import('../server/storage/encryptedStore.ts');
    encryptedStore.closeStorageDbForTests();
    rmSync(tempDir, { recursive: true, force: true });
    if (originalDbPath === undefined) delete process.env.IMAGE_STUDIO_DB_PATH;
    else process.env.IMAGE_STUDIO_DB_PATH = originalDbPath;
    if (originalStorageKey === undefined) delete process.env.IMAGE_STUDIO_STORAGE_KEY;
    else process.env.IMAGE_STUDIO_STORAGE_KEY = originalStorageKey;
    if (originalStorageKeyFile === undefined) delete process.env.IMAGE_STUDIO_STORAGE_KEY_FILE;
    else process.env.IMAGE_STUDIO_STORAGE_KEY_FILE = originalStorageKeyFile;
  }
});
