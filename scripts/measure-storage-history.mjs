#!/usr/bin/env node
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createGenerationTaskHistoryFixture, parseIntegerOption } from './storage-fixtures.mjs';

const args = process.argv.slice(2);
const useCurrentDb = args.includes('--use-current-db');
const keepTemp = args.includes('--keep-temp');
const taskCount = parseIntegerOption(args, 'tasks', 180);
const imagesPerTask = parseIntegerOption(args, 'images', 2);
const batchItemsPerTask = parseIntegerOption(args, 'batch-items', 1);
const batchImagesPerItem = parseIntegerOption(args, 'batch-images', 1);
const imageBytes = parseIntegerOption(args, 'image-bytes', 4096);
let tempDir = '';

if (!useCurrentDb) {
  tempDir = mkdtempSync(path.join(tmpdir(), 'image-studio-storage-measure-'));
  process.env.IMAGE_STUDIO_DB_PATH = path.join(tempDir, 'storage.sqlite');
  process.env.IMAGE_STUDIO_STORAGE_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
}

const taskStoreUrl = pathToFileURL(path.resolve('server/storage/generationTaskStore.ts')).href + `?measure=${Date.now()}`;
const taskStore = await import(taskStoreUrl);
const tasks = createGenerationTaskHistoryFixture({ taskCount, imagesPerTask, batchItemsPerTask, batchImagesPerItem, imageBytes });

async function measure(label, fn) {
  const start = performance.now();
  const value = await fn();
  return { label, ms: Math.round((performance.now() - start) * 10) / 10, value };
}

const save = await measure('save snapshot', () => taskStore.saveGenerationTaskHistoryDocuments(tasks));
const metadataLoad = await measure('load metadata', () => taskStore.loadGenerationTaskHistoryDocuments({ assetMode: 'metadata', limit: taskCount }));
const thumbnailLoad = await measure('load thumbnails', () => taskStore.loadGenerationTaskHistoryDocuments({ assetMode: 'thumbnail', limit: taskCount }));
const fullLoad = await measure('load full assets', () => taskStore.loadGenerationTaskHistoryDocuments({ assetMode: 'full', limit: Math.min(taskCount, 50) }));
const diagnostics = taskStore.getGenerationTaskStorageDiagnostics();
const audit = taskStore.auditGenerationTaskStorageDocuments();

const report = {
  dbPath: diagnostics.dbPath,
  fixture: { taskCount, imagesPerTask, batchItemsPerTask, batchImagesPerItem, imageBytes },
  timings: {
    saveMs: save.ms,
    loadMetadataMs: metadataLoad.ms,
    loadThumbnailMs: thumbnailLoad.ms,
    loadFullFirst50Ms: fullLoad.ms
  },
  storage: {
    taskRows: diagnostics.taskRows,
    assetRows: diagnostics.assetRows,
    fullAssetRows: diagnostics.fullAssetRows,
    thumbnailAssetRows: diagnostics.thumbnailAssetRows,
    compressedBytes: diagnostics.history.compressedBytes,
    encryptedBytes: diagnostics.history.encryptedBytes,
    declaredImageBytes: diagnostics.declaredImageBytes
  },
  audit: { ok: audit.ok, issues: audit.issues }
};

console.log(JSON.stringify(report, null, 2));

if (tempDir && !keepTemp) rmSync(tempDir, { recursive: true, force: true });
