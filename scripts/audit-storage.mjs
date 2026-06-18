#!/usr/bin/env node
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const strict = process.argv.includes('--strict');
const taskStoreUrl = pathToFileURL(path.resolve('server/storage/generationTaskStore.ts')).href + `?audit=${Date.now()}`;
const { auditGenerationTaskStorageDocuments } = await import(taskStoreUrl);
const audit = auditGenerationTaskStorageDocuments();
const diagnostics = audit.diagnostics;

console.log('Image Studio storage audit');
console.log(`  ok: ${audit.ok}`);
console.log(`  db: ${diagnostics.dbPath}`);
console.log(`  tasks: ${diagnostics.taskRows}`);
console.log(`  assets: ${diagnostics.assetRows} (${diagnostics.fullAssetRows} full, ${diagnostics.thumbnailAssetRows} thumbnails)`);
console.log(`  encrypted bytes: ${diagnostics.history.encryptedBytes}`);
console.log(`  compressed bytes: ${diagnostics.history.compressedBytes}`);
console.log('  buckets:');
for (const bucket of diagnostics.buckets) {
  console.log(`    - ${bucket.bucket}: ${bucket.documentCount} docs, ${bucket.encryptedBytes} encrypted bytes`);
}

if (audit.issues.length) {
  console.log('  issues:');
  for (const issue of audit.issues) console.log(`    - ${issue.kind}: ${issue.count}`);
} else {
  console.log('  issues: none');
}

if (strict && !audit.ok) process.exit(1);
