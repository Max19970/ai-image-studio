#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const violations = [];

const removedPaths = [
  'src/app/commands/createBatchComposerCommands.ts',
  'src/app/commands/commandFactoryHelpers.ts',
  'src/app/workspace/state/useBatchWorkspaceState.ts',
  'src/domain/requestBuilder.ts',
  'src/features/batch-composer',
  'src/features/workspace/sections/batch-composer',
  'src/features/workspace/sections/batch-parameters-modal',
  'src/features/workspace/sections/single-parameters-modal',
  'src/interface/context/workspace/batchComposer.ts',
  'src/interface/placements/batch-composer.layout.placement.ts',
  'src/processes/batch-runner/batchRunner.ts',
  'src/processes/batch-runner/batchRunProgress.ts',
  'src/processes/batch-runner/batchTaskModel.ts',
  'src/processes/batch-runner/events.ts',
  'src/processes/batch-runner/retryPolicy.ts',
  'src/processes/generation-runner/retryPolicy.ts',
  'src/processes/generation-runner/runner.ts',
  'src/processes/storage-sync/generationTaskAssets.ts',
  'src/shared/features/descriptors/batchComposer.feature.ts',
  'server/processes/generationTaskRuntime.ts',
  'server/routes/telegramMiniAppRoutes.ts',
  'server/storage/galleryFavoritesStore.ts',
  'src/entities/gallery/galleryFavorites.ts',
  'src/infrastructure/storage/remoteGalleryFavoriteStore.ts',
  'src/infrastructure/api.ts'
];

for (const relativePath of removedPaths) {
  if (fs.existsSync(path.join(root, relativePath))) {
    violations.push(`${relativePath} exists after its canonical replacement cutover.`);
  }
}

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

const productionFiles = [path.join(root, 'src'), path.join(root, 'server')]
  .flatMap(walk)
  .filter((file) => /\.(?:ts|tsx)$/.test(file));

const forbiddenTokens = [
  'BatchComposerDraft',
  'RetiredElement',
  'Legacy client-side direct batch runner quarantine',
  'galleryFavorite',
  'gallery-favorite.v1',
  'batchCompatibility'
];

for (const file of productionFiles) {
  const source = fs.readFileSync(file, 'utf8');
  for (const token of forbiddenTokens) {
    if (source.includes(token)) {
      violations.push(`${path.relative(root, file).replaceAll('\\', '/')} still contains retired token ${JSON.stringify(token)}.`);
    }
  }
}

const settingsCommandsPath = path.join(root, 'src/app/commands/createSettingsCommands.ts');
const settingsCommands = fs.readFileSync(settingsCommandsPath, 'utf8');
const applyCalls = settingsCommands.match(/applyStudioSettingsToComposer\(/g)?.length ?? 0;
if (applyCalls !== 1) {
  violations.push(`createSettingsCommands.ts must delegate Settings Apply exactly once; found ${applyCalls} calls.`);
}
if (/sanitize\w*DraftsAfterSettingsChange/.test(settingsCommands)) {
  violations.push('createSettingsCommands.ts still runs a second draft reconciliation path after atomic Settings Apply.');
}

const generationRequest = fs.readFileSync(path.join(root, 'src/domain/generationRequest.ts'), 'utf8');
if (!generationRequest.includes('export interface ComposerRequestDraft')) {
  violations.push('ComposerRequestDraft is missing as the canonical composer request type.');
}

const composerState = fs.readFileSync(path.join(root, 'src/app/workspace/state/useComposerWorkspaceState.ts'), 'utf8');
if (!composerState.includes('useReducer') || !composerState.includes('composerSessionReducer')) {
  violations.push('Composer workspace state is not owned by the canonical composer session reducer.');
}

if (violations.length > 0) {
  console.error('Refactor cutover check failed:');
  for (const violation of violations) console.error(`  - ${violation}`);
  process.exit(1);
}

console.log('Refactor cutover summary:');
console.log(`  ${removedPaths.length} retired paths remain absent`);
console.log(`  ${productionFiles.length} production modules scanned for retired tokens`);
console.log('  Settings Apply has one atomic composer reconciliation path');
console.log('  ComposerRequestDraft and composerSessionReducer are canonical');
console.log('Refactor cutover check passed.');
