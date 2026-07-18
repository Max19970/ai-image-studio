#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const serverRoot = path.join(root, 'server');

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function relative(file) {
  return path.relative(root, file).replaceAll('\\', '/');
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function fail(violations) {
  console.error('Server boundary check failed:');
  for (const violation of violations) console.error(`  - ${violation}`);
  process.exit(1);
}

const files = walk(serverRoot).filter((file) => /\.(?:ts|tsx)$/.test(file));
const routes = files.filter((file) => relative(file).startsWith('server/routes/'));
const violations = [];

const removedLegacyModules = [
  'server/storage/galleryFoldersStore.ts',
  'server/storage/galleryMetadataStore.ts',
  'server/processes/generation-task-runtime/galleryMutations.ts'
];
for (const modulePath of removedLegacyModules) {
  if (fs.existsSync(path.join(root, modulePath))) violations.push(`${modulePath} was restored after the GalleryCatalog cutover.`);
}

for (const file of routes) {
  const source = read(file);
  const name = relative(file);
  if (/from ['"].*generation-task-runtime\/runtimeStore['"]/.test(source)) {
    violations.push(`${name} imports runtimeStore directly instead of a route-facing port.`);
  }
  if (/from ['"].*storage\/(?:galleryCatalogStore|galleryFoldersStore|galleryMetadataStore)['"]/.test(source)) {
    violations.push(`${name} imports gallery persistence directly instead of GalleryCatalog.`);
  }
}

const galleryRoutesPath = path.join(root, 'server/routes/galleryFolderRoutes.ts');
const galleryRoutes = read(galleryRoutesPath);
if (!/import type \{ GalleryCatalog \}/.test(galleryRoutes)) {
  violations.push('galleryFolderRoutes.ts does not depend on the GalleryCatalog boundary.');
}
if (/generationTasks|moveGalleryFolderTasks|pasteGalleryTasksState|saveGalleryCatalog/.test(galleryRoutes)) {
  violations.push('galleryFolderRoutes.ts contains catalog orchestration instead of HTTP adaptation only.');
}

const runtimePort = read(path.join(root, 'server/processes/generation-task-runtime/runtimePort.ts'));
if (/Gallery|gallery/.test(runtimePort)) {
  violations.push('generation-task runtime port exposes gallery-specific mutations after the catalog cutover.');
}

const catalog = read(path.join(root, 'server/gallery/catalog.ts'));
if (!/commitGalleryMutation/.test(catalog) || !/saveGalleryCatalogStateDocumentsAsync/.test(catalog)) {
  violations.push('default GalleryCatalog is not wired through the atomic runtime/storage commit seam.');
}

const historyRoutes = read(path.join(root, 'server/routes/generationTaskHistoryRoutes.ts'));
if (/saveGenerationTaskHistoryDocuments|clearGenerationTaskHistoryDocuments/.test(historyRoutes)) {
  violations.push('generation task history routes regained direct write ownership.');
}

if (violations.length > 0) fail(violations);

console.log('Server boundary summary:');
console.log(`  ${routes.length} route modules scanned`);
console.log('  GalleryCatalog is the sole gallery orchestration boundary');
console.log('  generation task runtime port is gallery-agnostic');
console.log('  task history storage routes remain read-only');
console.log('Server boundary check passed.');
