#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'server/storage/schema.ts',
  'server/storage/encryptedStore.ts',
  'server/storage/generationTaskStore.ts',
  'server/storage/generation-tasks/generationTaskRepository.ts',
  'server/storage/generation-tasks/generationTaskCodecs.ts',
  'server/storage/generation-tasks/generationTaskAssets.ts',
  'server/storage/generation-tasks/generationTaskRows.ts',
  'server/storage/generation-tasks/generationTaskStats.ts',
  'server/storage/generation-tasks/generationTaskDiagnostics.ts',
  'server/storage/generation-tasks/generationTaskLegacyFallback.ts',
  'server/storage/appDocumentStore.ts',
  'server/storage/migrations/002_storage_v2_documents.ts',
  'server/storage/migrations/003_gallery_paths.ts',
  'server/storage/galleryFoldersStore.ts',
  'server/routes/galleryFolderRoutes.ts',
  'src/infrastructure/storage/remoteGalleryFolderStore.ts',
  'src/infrastructure/storage/remoteGenerationTaskHistoryStore.ts',
  'src/infrastructure/storage/remoteStudioSettingsStore.ts',
  'src/infrastructure/storage/remoteImageParamsStore.ts',
  'src/infrastructure/storage/remoteProviderProbeCache.ts'
];

const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error('Storage architecture check failed: missing files');
  missing.forEach((file) => console.error(`  - ${file}`));
  process.exit(1);
}

const schema = fs.readFileSync(path.join(root, 'server/storage/schema.ts'), 'utf8');
const encryptedStore = fs.readFileSync(path.join(root, 'server/storage/encryptedStore.ts'), 'utf8');
const taskStoreFiles = [
  'server/storage/generationTaskStore.ts',
  'server/storage/generation-tasks/generationTaskRepository.ts',
  'server/storage/generation-tasks/generationTaskCodecs.ts',
  'server/storage/generation-tasks/generationTaskAssets.ts',
  'server/storage/generation-tasks/generationTaskRows.ts',
  'server/storage/generation-tasks/generationTaskStats.ts',
  'server/storage/generation-tasks/generationTaskDiagnostics.ts',
  'server/storage/generation-tasks/generationTaskLegacyFallback.ts'
];
const taskStore = taskStoreFiles.map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
const appDocumentStore = fs.readFileSync(path.join(root, 'server/storage/appDocumentStore.ts'), 'utf8');
const remoteHistoryStore = fs.readFileSync(path.join(root, 'src/infrastructure/storage/remoteGenerationTaskHistoryStore.ts'), 'utf8');
const galleryFoldersStore = fs.readFileSync(path.join(root, 'server/storage/galleryFoldersStore.ts'), 'utf8');
const remoteGalleryFolderStore = fs.readFileSync(path.join(root, 'src/infrastructure/storage/remoteGalleryFolderStore.ts'), 'utf8');
const storageSyncHistory = fs.readFileSync(path.join(root, 'src/processes/storage-sync/generationTaskHistory.ts'), 'utf8');
const storageSyncSettings = fs.readFileSync(path.join(root, 'src/processes/storage-sync/studioSettings.ts'), 'utf8');
const storageSyncParams = fs.readFileSync(path.join(root, 'src/processes/storage-sync/imageParams.ts'), 'utf8');
const storageSyncProbeCache = fs.readFileSync(path.join(root, 'src/processes/storage-sync/providerProbeCache.ts'), 'utf8');
const serverApiRoutes = ['server/index.ts', 'server/routes/generationTaskStorageRoutes.ts', 'server/routes/generationTaskAssetRoutes.ts', 'server/routes/generationTaskDiagnosticsRoutes.ts', 'server/routes/generationTaskDownloadRoutes.ts', 'server/routes/generationTaskHistoryRoutes.ts'].map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');

const expectations = [
  ['schema version is v3', /storageSchemaVersion\s*=\s*3/.test(schema)],
  ['storage document bucket table exists', /storage_documents/.test(schema)],
  ['generation task table exists', /generation_tasks/.test(schema)],
  ['generation tasks have gallery path index', /gallery_path/.test(schema) && /idx_generation_tasks_gallery_path/.test(schema)],
  ['generation task asset table exists', /generation_task_assets/.test(schema)],
  ['encrypted document API exists', /saveEncryptedDocument/.test(encryptedStore) && /loadEncryptedDocument/.test(encryptedStore)],
  ['generation task store splits images', /cloneWithoutImages/.test(taskStore) && /collectImages/.test(taskStore)],
  ['generation task store stores thumbnails', /thumbnail/.test(taskStore) && /thumbnailCount/.test(taskStore)],
  ['generation task store supports asset modes', /assetMode/.test(taskStore) && /metadata/.test(taskStore)],
  ['generation task store restores images', /restoreTaskImages/.test(taskStore)],
  ['server routes use v2 task store', /loadGenerationTaskHistoryDocuments/.test(serverApiRoutes) && /saveGenerationTaskHistoryDocuments/.test(serverApiRoutes)],
  ['generation task store is split into repository modules', /generationTaskRepository/.test(taskStore) && /generationTaskCodecs/.test(taskStore) && /generationTaskRows/.test(taskStore)],
  ['server exposes lazy asset endpoint', /generation-task-asset/.test(serverApiRoutes) && /loadGenerationTaskAssetDocument/.test(serverApiRoutes)],
  ['server exposes storage diagnostics and audit endpoints', /generation-tasks\/diagnostics/.test(serverApiRoutes) && /generation-tasks\/audit/.test(serverApiRoutes) && /getGenerationTaskStorageDiagnostics/.test(taskStore) && /auditGenerationTaskStorageDocuments/.test(taskStore)],
  ['app document store exists', /studio-settings\.v2/.test(appDocumentStore) && /provider-probe-cache\.v2/.test(appDocumentStore)],
  ['remote history store supports asset endpoint', /generationTaskAssetEndpoint/.test(remoteHistoryStore) && /loadGenerationTaskAsset/.test(remoteHistoryStore)],
  ['gallery folder store uses encrypted documents', /generationGalleryFolderBucket/.test(galleryFoldersStore) && /saveEncryptedDocument/.test(galleryFoldersStore) && /loadGalleryFolders/.test(galleryFoldersStore)],
  ['remote gallery folder store exists', /gallery-folders/.test(remoteGalleryFolderStore) && /moveRemoteGalleryItem/.test(remoteGalleryFolderStore)],
  ['history sync creates thumbnails before persistence', /createOptimizedThumbnail/.test(storageSyncHistory) && /withGeneratedImageThumbnails/.test(storageSyncHistory)],
  ['settings sync uses encrypted remote store', /loadStudioSettingsFromDatabase/.test(storageSyncSettings) && /remoteStudioSettingsStore/.test(storageSyncSettings)],
  ['image params sync uses encrypted remote store', /loadImageParamsFromDatabase/.test(storageSyncParams) && /remoteImageParamsStore/.test(storageSyncParams)],
  ['provider probe cache sync uses encrypted remote store', /loadProviderProbeReportFromDatabase/.test(storageSyncProbeCache) && /remoteProviderProbeCache/.test(storageSyncProbeCache)]
];

const failed = expectations.filter(([, ok]) => !ok);
if (failed.length) {
  console.error('Storage architecture check failed:');
  failed.forEach(([name]) => console.error(`  - ${name}`));
  process.exit(1);
}

const migrationFiles = fs.readdirSync(path.join(root, 'server/storage/migrations')).filter((file) => file.endsWith('.ts'));
console.log('Storage architecture summary:');
console.log(`  schema version: 3`);
console.log(`  ${migrationFiles.length - 1} storage migrations plus registry`);
console.log('  normalized generation task table enabled');
console.log('  gallery path index and encrypted folder descriptors enabled');
console.log('  separated encrypted image asset documents enabled');
console.log('  encrypted thumbnail asset documents enabled');
console.log('  lazy history asset modes and single asset endpoint enabled');
console.log('  settings, params and provider probe cache document buckets enabled');
console.log('  storage diagnostics and orphan audit enabled');
console.log('Storage architecture check passed.');
