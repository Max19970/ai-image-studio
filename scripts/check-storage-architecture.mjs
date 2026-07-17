#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'server/storage/schema.ts',
  'server/storage/config.ts',
  'server/storage/keyProvider.ts',
  'server/storage/jsonCodec.ts',
  'server/storage/sqliteConnection.ts',
  'server/storage/encryptedStore.ts',
  'server/storage/generationTaskStore.ts',
  'server/storage/generation-tasks/generationTaskRepository.ts',
  'server/storage/generation-tasks/generationTaskCodecs.ts',
  'server/storage/generation-tasks/generationTaskAssets.ts',
  'server/storage/generation-tasks/generationTaskRows.ts',
  'server/storage/generation-tasks/generationTaskStats.ts',
  'server/storage/generation-tasks/generationTaskDiagnostics.ts',
  'server/storage/generation-tasks/generationTaskLegacyFallback.ts',
  'server/storage/appDocumentDescriptors.ts',
  'server/storage/appDocumentStore.ts',
  'server/storage/migrations/002_storage_v2_documents.ts',
  'server/storage/migrations/003_gallery_paths.ts',
  'server/storage/migrations/registry.ts',
  'server/storage/migrations/registry.generated.ts',
  'server/storage/migrations/types.ts',
  'server/gallery/descriptors.ts',
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
const storageConfig = fs.readFileSync(path.join(root, 'server/storage/config.ts'), 'utf8');
const storageKeyProvider = fs.readFileSync(path.join(root, 'server/storage/keyProvider.ts'), 'utf8');
const storageJsonCodec = fs.readFileSync(path.join(root, 'server/storage/jsonCodec.ts'), 'utf8');
const storageConnection = fs.readFileSync(path.join(root, 'server/storage/sqliteConnection.ts'), 'utf8');
const encryptedStore = fs.readFileSync(path.join(root, 'server/storage/encryptedStore.ts'), 'utf8');
const storageMigrationRegistry = fs.readFileSync(path.join(root, 'server/storage/migrations/registry.ts'), 'utf8');
const storageMigrationGeneratedRegistry = fs.readFileSync(path.join(root, 'server/storage/migrations/registry.generated.ts'), 'utf8');
const storageMigrationIndex = fs.readFileSync(path.join(root, 'server/storage/migrations/index.ts'), 'utf8');
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
const appDocumentDescriptors = fs.readFileSync(path.join(root, 'server/storage/appDocumentDescriptors.ts'), 'utf8');
const appDocumentStore = fs.readFileSync(path.join(root, 'server/storage/appDocumentStore.ts'), 'utf8');
const appDocumentRoutes = fs.readFileSync(path.join(root, 'server/routes/appDocumentStorageRoutes.ts'), 'utf8');
const remoteHistoryStore = fs.readFileSync(path.join(root, 'src/infrastructure/storage/remoteGenerationTaskHistoryStore.ts'), 'utf8');
const galleryDescriptors = fs.readFileSync(path.join(root, 'server/gallery/descriptors.ts'), 'utf8');
const galleryFoldersStore = fs.readFileSync(path.join(root, 'server/storage/galleryFoldersStore.ts'), 'utf8');
const galleryFolderRoutes = fs.readFileSync(path.join(root, 'server/routes/galleryFolderRoutes.ts'), 'utf8');
const galleryMutations = fs.readFileSync(path.join(root, 'server/processes/generation-task-runtime/galleryMutations.ts'), 'utf8');
const galleryMetadataStore = fs.readFileSync(path.join(root, 'server/storage/galleryMetadataStore.ts'), 'utf8');
const remoteGalleryFolderStore = fs.readFileSync(path.join(root, 'src/infrastructure/storage/remoteGalleryFolderStore.ts'), 'utf8');
const storageSyncHistory = fs.readFileSync(path.join(root, 'src/processes/storage-sync/generationTaskHistory.ts'), 'utf8');
const storageSyncSettings = fs.readFileSync(path.join(root, 'src/processes/storage-sync/studioSettings.ts'), 'utf8');
const storageSyncParams = fs.readFileSync(path.join(root, 'src/processes/storage-sync/imageParams.ts'), 'utf8');
const storageSyncProbeCache = fs.readFileSync(path.join(root, 'src/processes/storage-sync/providerProbeCache.ts'), 'utf8');
const persistentWorkspaceSettings = fs.readFileSync(path.join(root, 'src/app/workspace/state/usePersistentWorkspaceSettings.ts'), 'utf8');
const providerProbeState = fs.readFileSync(path.join(root, 'src/app/workspace/state/useProviderProbeState.ts'), 'utf8');
const generationTaskDownloadUseCases = fs.readFileSync(path.join(root, 'server/processes/generation-task-downloads/downloadUseCases.ts'), 'utf8');
const generationTaskHistoryRoutes = fs.readFileSync(path.join(root, 'server/routes/generationTaskHistoryRoutes.ts'), 'utf8');
const serverApiRoutes = ['server/index.ts', 'server/routes/generationTaskStorageRoutes.ts', 'server/routes/generationTaskAssetRoutes.ts', 'server/routes/generationTaskDiagnosticsRoutes.ts', 'server/routes/generationTaskDownloadRoutes.ts', 'server/routes/generationTaskHistoryRoutes.ts'].map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');

const expectations = [
  ['schema version is v3', /storageSchemaVersion\s*=\s*3/.test(schema)],
  ['storage document bucket table exists', /storage_documents/.test(schema)],
  ['generation task table exists', /generation_tasks/.test(schema)],
  ['generation tasks have gallery path index', /gallery_path/.test(schema) && /idx_generation_tasks_gallery_path/.test(schema)],
  ['generation task asset table exists', /generation_task_assets/.test(schema)],
  ['storage migrations are descriptor-driven', /listStorageMigrations/.test(storageMigrationRegistry) && /storageMigrationGeneratedModules/.test(storageMigrationGeneratedRegistry) && /listStorageMigrations\(\)/.test(storageMigrationIndex) && !/const\s+storageMigrations\s*=\s*\[/.test(storageMigrationIndex)],
  ['storage env/path/key/codec/connection ports are split from encrypted store', /resolveStoragePathConfig/.test(storageConfig) && /createStorageKeyProvider/.test(storageKeyProvider) && /createEncryptedJsonCodec/.test(storageJsonCodec) && /sqliteStorageConnectionFactory/.test(storageConnection) && /createStorageRuntimeContext/.test(encryptedStore)],
  ['encrypted document API exists', /saveEncryptedDocument/.test(encryptedStore) && /loadEncryptedDocument/.test(encryptedStore)],
  ['generation task store splits images', /cloneWithoutImages/.test(taskStore) && /collectImages/.test(taskStore)],
  ['generation task store stores thumbnails', /thumbnail/.test(taskStore) && /thumbnailCount/.test(taskStore)],
  ['generation task store supports asset modes', /assetMode/.test(taskStore) && /metadata/.test(taskStore)],
  ['generation task store restores images', /restoreTaskImages/.test(taskStore)],
  ['server task history routes are read-only v2 readers',
    /loadGenerationTaskHistoryDocuments/.test(generationTaskHistoryRoutes)
      && !/saveGenerationTaskHistoryDocuments/.test(generationTaskHistoryRoutes)
      && !/clearGenerationTaskHistoryDocuments/.test(generationTaskHistoryRoutes)
      && /status\(405\)/.test(generationTaskHistoryRoutes)],
  ['generation task store is split into repository modules', /generationTaskRepository/.test(taskStore) && /generationTaskCodecs/.test(taskStore) && /generationTaskRows/.test(taskStore)],
  ['server exposes lazy asset endpoint', /generation-task-asset/.test(serverApiRoutes) && /loadGenerationTaskAssetDocument/.test(serverApiRoutes)],
  ['server exposes storage diagnostics and audit endpoints', /generation-tasks\/diagnostics/.test(serverApiRoutes) && /generation-tasks\/audit/.test(serverApiRoutes) && /getGenerationTaskStorageDiagnostics/.test(taskStore) && /auditGenerationTaskStorageDocuments/.test(taskStore)],
  ['generation task download archive use cases are split from routes', /createGenerationTaskImageDownloadRegistration/.test(generationTaskDownloadUseCases) && /createGenerationTaskArchiveDownload/.test(generationTaskDownloadUseCases) && /sendBinaryDownloadResponse/.test(serverApiRoutes) && !/function taskImages/.test(serverApiRoutes)],
  ['app document descriptors own buckets and routes', /appDocumentBuckets/.test(appDocumentDescriptors) && /listAppDocumentRouteDescriptors/.test(appDocumentDescriptors) && /integration-settings\.v1/.test(appDocumentDescriptors) && /for \(const descriptor of listAppDocumentRouteDescriptors\(\)\)/.test(appDocumentRoutes)],
  ['app document store exists', /studioSettingsBucket/.test(appDocumentStore) && /providerProbeCacheBucket/.test(appDocumentStore)],
  ['remote history store supports asset endpoint', /generationTaskAssetEndpoint/.test(remoteHistoryStore) && /loadGenerationTaskAsset/.test(remoteHistoryStore)],
  ['gallery descriptors own item kinds and paste operation policies', /galleryItemKindDescriptors/.test(galleryDescriptors) && /galleryPasteOperationDescriptors/.test(galleryDescriptors) && /galleryItemCanContainChildren/.test(galleryFoldersStore) && /galleryPasteOperationDuplicatesTasks/.test(galleryMutations) && /parseGalleryItemKind/.test(galleryFolderRoutes) && /normalizeGalleryMetadataKind/.test(galleryMetadataStore)],
  ['gallery folder store uses encrypted documents', /generationGalleryFolderBucket/.test(galleryFoldersStore) && /saveEncryptedDocument/.test(galleryFoldersStore) && /loadGalleryFolders/.test(galleryFoldersStore)],
  ['remote gallery folder store exists', /gallery-folders/.test(remoteGalleryFolderStore) && /moveRemoteGalleryItem/.test(remoteGalleryFolderStore)],
  ['client history sync is fallback-only and has no remote writer',
    /localGenerationTaskCache/.test(storageSyncHistory)
      && !/remoteGenerationTaskHistoryStore/.test(storageSyncHistory)
      && !/saveGenerationTaskHistory/.test(storageSyncHistory)
      && !/clearGenerationTaskHistory/.test(storageSyncHistory)],
  ['settings sync uses the shared controller over encrypted remote storage',
    /studioSettingsSyncDescriptor/.test(storageSyncSettings)
      && /remoteStudioSettingsStore/.test(storageSyncSettings)
      && /useSyncedDocumentState\(studioSettingsSyncDescriptor/.test(persistentWorkspaceSettings)],
  ['image params sync uses the shared controller over encrypted remote storage',
    /imageParamsSyncDescriptor/.test(storageSyncParams)
      && /remoteImageParamsStore/.test(storageSyncParams)
      && /useSyncedDocumentState\(imageParamsSyncDescriptor/.test(persistentWorkspaceSettings)],
  ['provider probe cache sync owns one synchronized map',
    /providerProbeCacheSyncDescriptor/.test(storageSyncProbeCache)
      && /remoteProviderProbeCache/.test(storageSyncProbeCache)
      && /useSyncedDocumentState\(providerProbeCacheSyncDescriptor/.test(providerProbeState)
      && /getCachedProviderProbeReport\(cache\.value, provider\)/.test(providerProbeState)]
];

const failed = expectations.filter(([, ok]) => !ok);
if (failed.length) {
  console.error('Storage architecture check failed:');
  failed.forEach(([name]) => console.error(`  - ${name}`));
  process.exit(1);
}

const migrationFiles = fs.readdirSync(path.join(root, 'server/storage/migrations')).filter((file) => /^\d{3}_.+\.ts$/.test(file));
console.log('Storage architecture summary:');
console.log(`  schema version: 3`);
console.log(`  ${migrationFiles.length} descriptor-owned storage migrations`);
console.log('  descriptor-driven storage migration registry enabled');
console.log('  storage path, key, codec and SQLite connection ports enabled');
console.log('  normalized generation task table enabled');
console.log('  gallery item kind and paste operation descriptors enabled');
console.log('  gallery path index and encrypted folder descriptors enabled');
console.log('  separated encrypted image asset documents enabled');
console.log('  encrypted thumbnail asset documents enabled');
console.log('  lazy history asset modes and single asset endpoint enabled');
console.log('  descriptor-owned app document buckets and routes enabled');
console.log('  settings, params and provider probe cache document buckets enabled');
console.log('  generation task download registration and archive use cases enabled');
console.log('  storage diagnostics and orphan audit enabled');
console.log('Storage architecture check passed.');
