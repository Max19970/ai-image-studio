#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const strict = args.has('--strict') || process.env.DEBT_BUDGET_STRICT === '1';

const ignoredDirs = new Set([
  '.git',
  'node_modules',
  'dist',
  'artifacts',
  'coverage',
  '.vite'
]);

const warningBudgets = [
  {
    id: 'large-ts-source-file',
    label: 'TS/TSX source file over 300 lines',
    kind: 'files',
    extensions: ['.ts', '.tsx'],
    limit: 300,
    exclude: (relativePath) => relativePath.endsWith('.d.ts') || relativePath.startsWith('tests/')
  },
  {
    id: 'large-module-css-file',
    label: 'module CSS file over 500 lines',
    kind: 'files',
    extensions: ['.module.css'],
    limit: 500
  },
  {
    id: 'global-css-layer-total',
    label: 'global CSS layer total over 1600 lines',
    kind: 'total',
    files: ['src/styles/layers/*.css'],
    limit: 1600
  },
  {
    id: 'mobile-css-quarantine',
    label: 'mobile.css over 300 lines',
    kind: 'single',
    file: 'src/styles/layers/mobile.css',
    limit: 300
  },
  {
    id: 'app-primitives-css',
    label: 'app-primitives.css over 500 lines',
    kind: 'single',
    file: 'src/styles/layers/app-primitives.css',
    limit: 500
  }
];

const growthCaps = [
  ['src/styles/layers/mobile.css', 260],
  ['src/styles/layers/motion.css', 90],
  ['src/features/detail/ImageDetailPage.module.css', 80],
  ['src/features/detail/sections/hero/DetailHeroSection.module.css', 420],
  ['src/features/detail/sections/carousel/DetailResultCarousel.module.css', 320],
  ['src/features/detail/sections/snapshot/DetailSnapshotSections.module.css', 480],
  ['src/features/detail/sections/snapshot/DetailSnapshotSections.tsx', 320],
  ['src/features/detail/sections/carousel/DetailResultCarousel.tsx', 150],
  ['src/styles/layers/app-shell.css', 260],
  ['src/styles/layers/app-primitives.css', 560],
  ['src/features/batch-composer/MultiImageComposer.module.css', 90],
  ['src/features/batch-composer/sections/controls/BatchComposerControlsSection.module.css', 160],
  ['src/features/batch-composer/sections/draft-attachments/BatchDraftAttachmentsSection.module.css', 40],
  ['src/features/batch-composer/sections/draft-card/BatchDraftCardSection.module.css', 60],
  ['src/features/batch-composer/sections/draft-header/BatchDraftHeaderSection.module.css', 110],
  ['src/features/batch-composer/sections/draft-list/BatchDraftListSection.module.css', 50],
  ['src/features/batch-composer/sections/draft-mode/BatchDraftModeSection.module.css', 110],
  ['src/features/batch-composer/sections/draft-prompt/BatchDraftPromptSection.module.css', 100],
  ['src/features/batch-composer/sections/draft-toolbar/BatchDraftToolbarSection.module.css', 120],
  ['src/features/batch-composer/sections/footer/BatchComposerFooterSection.module.css', 80],
  ['src/features/batch-composer/sections/header/BatchComposerHeaderSection.module.css', 100],
  ['src/features/gallery/ResultsGallery.module.css', 460],
  ['src/features/gallery/ResultsGallery.tsx', 90],
  ['src/features/gallery/model/galleryArchive.ts', 130],
  ['src/features/gallery/sections/header/GalleryHeaderSection.tsx', 130],
  ['src/features/gallery/sections/header/GalleryHeaderSection.module.css', 260],
  ['src/features/detail/model/useHydratedDetailAssets.ts', 110],
  ['src/processes/storage-sync/generationTaskHistory.ts', 160],
  ['src/features/image-actions/elements/download-image/DownloadImageAction.tsx', 90],
  ['src/entities/gallery/archiveTypes.ts', 50],
  ['src/features/settings/sections/generation-api/GenerationApiSettingsSection.module.css', 120],
  ['src/features/settings/sections/generation-api/GenerationApiDesktopPanels.module.css', 180],
  ['src/features/settings/sections/generation-api/GenerationApiEditor.module.css', 100],
  ['src/features/settings/sections/generation-api/GenerationApiMobilePanels.module.css', 220],
  ['src/features/settings/sections/generation-api/adapter-selector/ProviderAdapterField.module.css', 110],
  ['src/features/settings/sections/generation-api/provider-check-panel/ProviderCheckCard.module.css', 90],
  ['src/features/settings/model/settingsDraftSelection.ts', 80],
  ['server/storage/generationTaskStore.ts', 80],
  ['server/storage/generation-tasks/generationTaskRepository.ts', 180],
  ['server/storage/generation-tasks/generationTaskCodecs.ts', 280],
  ['server/storage/generation-tasks/generationTaskDiagnostics.ts', 160],
  ['server/storage/generation-tasks/generationTaskRows.ts', 110],
  ['server/storage/generation-tasks/generationTaskStats.ts', 80],
  ['server/storage/generation-tasks/generationTaskDiagnostics.ts', 160],
  ['server/storage/generation-tasks/generationTaskAssets.ts', 60],
  ['server/storage/generation-tasks/generationTaskLegacyFallback.ts', 50],
  ['server/storage/generation-tasks/types.ts', 130],
  ['src/app/commands/appCommands.ts', 80],
  ['src/app/commands/appCommandTypes.ts', 100],
  ['src/app/commands/createComposerCommands.ts', 90],
  ['src/app/commands/createSettingsCommands.ts', 70],
  ['src/app/workspace/createWorkspaceContexts.ts', 50],
  ['src/app/workspace/contexts/createMainContext.ts', 70],
  ['src/app/workspace/useWorkspaceState.ts', 80],
  ['src/app/workspace/state/usePersistentWorkspaceSettings.ts', 120],
  ['src/app/workspace/state/useProviderProbeState.ts', 100],
  ['src/app/workspace/state/useTaskSelectionState.ts', 90],
  ['src/processes/batch-runner/batchTaskReducer.ts', 140],
  ['scripts/check-motion-architecture.mjs', 140],
  ['scripts/check-ui-accessibility.mjs', 120],
  ['scripts/audit-storage.mjs', 80],
  ['scripts/measure-storage-history.mjs', 100],
  ['scripts/storage-fixtures.mjs', 100],
  ['server/index.ts', 50],
  ['server/app.ts', 50],
  ['server/http/errors.ts', 80],
  ['server/http/cors.ts', 60],
  ['server/http/staticClient.ts', 50],
  ['server/routes/index.ts', 50],
  ['server/routes/generationRoutes.ts', 70],
  ['server/routes/providerRoutes.ts', 60],
  ['server/routes/generationTaskStorageRoutes.ts', 110],
  ['server/routes/appDocumentStorageRoutes.ts', 90],
  ['server/routes/defaultRoutes.ts', 50],
  ['src/domain/types.ts', 40],
  ['src/domain/imageParams.ts', 70],
  ['src/domain/providerSettings.ts', 60],
  ['src/domain/studioSettings.ts', 40],
  ['src/domain/generationTask.ts', 140],
  ['src/domain/providerProbe.ts', 80],
  ['src/interface/context/workspace.ts', 40],
  ['src/interface/context/workspace/gallery.ts', 80],
  ['src/interface/context/workspace/composerDock.ts', 70],
  ['src/interface/context/workspace/detail.ts', 50],
  ['src/interface/context/workspace/settings.ts', 50],
  ['src/interface/context/workspace/main.ts', 40],
  ['server/providers/openai-compatible/adapter.ts', 80],
  ['server/providers/openai-compatible/probeSuite.ts', 240],
  ['server/providers/openai-compatible/probeClassifier.ts', 60],
  ['server/providers/openai-compatible/settingsSchema.ts', 40],
  ['server/providers/openai-compatible/requestHandlers.ts', 80],
  ['server/providers/openai-compatible/errorNormalizer.ts', 80],
  ['src/providers/openai-compatible/requestAdapter.ts', 140],
  ['src/providers/openai-compatible/responseAdapter.ts', 90],
  ['src/providers/openai-compatible/settingsSchema.ts', 90],
  ['src/providers/openai-compatible/parameterProfile.ts', 40],
  ['tests/provider-adapter-contract.test.ts', 190],

  ['src/entities/generation-params/defineParam.ts', 30],
  ['src/entities/generation-params/availability.ts', 130],
  ['scripts/check-generation-params.mjs', 220],
  ['tests/generation-param-plugin-contract.test.ts', 170],
  ['docs/GENERATION_PARAM_PLUGIN_CONTRACT.md', 190],
  ['docs/PROVIDER_ADAPTER_CONTRACT.md', 150],
  ['src/shared/ui/FloatingPopover/FloatingPopover.tsx', 300],
  ['src/shared/ui/PopoverSelect/PopoverSelect.tsx', 300],
  ['src/shared/ui/PopoverSelect/PopoverSelect.module.css', 190],
  ['src/shared/ui/IconButton/IconButton.module.css', 80],
  ['src/features/composer/ui/ActionIconButton.module.css', 110]
];

const totalGrowthCaps = [
  ['src/styles/layers/*.css', 1650, 'global CSS layer total grew beyond stage-2 cap']
];

const strictTargetBudgets = [
  ['src/styles/layers/mobile.css', 500],
  ['src/styles/layers/app-shell.css', 260],
  ['src/styles/layers/app-primitives.css', 500],
  ['src/styles/layers/motion.css', 90],
  ['src/styles/layers/*.css', 1600, 'global CSS layer total'],
  ['src/app/workspace/useWorkspaceState.ts', 220],
  ['src/app/commands/appCommands.ts', 80],
  ['src/app/workspace/createWorkspaceContexts.ts', 80],
  ['server/storage/generationTaskStore.ts', 80],
  ['server/storage/generation-tasks/generationTaskRepository.ts', 180],
  ['server/storage/generation-tasks/generationTaskCodecs.ts', 280],
  ['server/storage/generation-tasks/generationTaskDiagnostics.ts', 160],
  ['server/index.ts', 50],
  ['server/app.ts', 50],
  ['server/http/errors.ts', 80],
  ['server/http/cors.ts', 60],
  ['server/http/staticClient.ts', 50],
  ['server/routes/index.ts', 50],
  ['server/routes/generationRoutes.ts', 70],
  ['server/routes/providerRoutes.ts', 60],
  ['server/routes/generationTaskStorageRoutes.ts', 110],
  ['server/routes/appDocumentStorageRoutes.ts', 90],
  ['server/routes/defaultRoutes.ts', 50],
  ['src/domain/types.ts', 40],
  ['src/domain/imageParams.ts', 70],
  ['src/domain/providerSettings.ts', 60],
  ['src/domain/studioSettings.ts', 40],
  ['src/domain/generationTask.ts', 140],
  ['src/domain/providerProbe.ts', 80],
  ['src/interface/context/workspace.ts', 40],
  ['src/interface/context/workspace/gallery.ts', 80],
  ['src/interface/context/workspace/composerDock.ts', 70],
  ['src/interface/context/workspace/detail.ts', 50],
  ['src/interface/context/workspace/settings.ts', 50],
  ['src/interface/context/workspace/main.ts', 40],
  ['server/providers/openai-compatible/adapter.ts', 80],
  ['server/providers/openai-compatible/probeSuite.ts', 240],
  ['src/providers/openai-compatible/requestAdapter.ts', 140],
  ['server/index.ts', 50],
  ['server/routes/generationTaskStorageRoutes.ts', 110],
  ['src/domain/types.ts', 40],
  ['src/interface/context/workspace.ts', 40]
];

function lineCount(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  if (text.length === 0) return 0;
  return text.split(/\r?\n/).length;
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.env.example') continue;
    const absolute = path.join(dir, entry.name);
    const relative = path.relative(root, absolute).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) walk(absolute, files);
      continue;
    }
    if (entry.isFile()) files.push(relative);
  }
  return files;
}

function expandFiles(pattern) {
  if (!pattern.includes('*')) return [pattern].filter((file) => fs.existsSync(path.join(root, file)));
  const directory = path.dirname(pattern);
  const suffix = pattern.slice(pattern.indexOf('*') + 1);
  const absoluteDir = path.join(root, directory);
  if (!fs.existsSync(absoluteDir)) return [];
  return fs
    .readdirSync(absoluteDir)
    .filter((name) => name.endsWith(suffix))
    .map((name) => `${directory}/${name}`.replace(/\\/g, '/'));
}

function formatItem({ file, lines, limit }) {
  return `  - ${file}: ${lines} lines (limit ${limit})`;
}

const allFiles = walk(root);
const warnings = [];
const failures = [];

for (const budget of warningBudgets) {
  if (budget.kind === 'files') {
    const matches = allFiles
      .filter((file) => budget.extensions.some((extension) => file.endsWith(extension)))
      .filter((file) => !budget.exclude?.(file))
      .map((file) => ({ file, lines: lineCount(path.join(root, file)), limit: budget.limit }))
      .filter((item) => item.lines > budget.limit)
      .sort((a, b) => b.lines - a.lines);
    if (matches.length) warnings.push({ label: budget.label, items: matches });
    continue;
  }

  if (budget.kind === 'single') {
    const filePath = path.join(root, budget.file);
    if (!fs.existsSync(filePath)) continue;
    const lines = lineCount(filePath);
    if (lines > budget.limit) warnings.push({ label: budget.label, items: [{ file: budget.file, lines, limit: budget.limit }] });
    continue;
  }

  if (budget.kind === 'total') {
    const files = budget.files.flatMap(expandFiles);
    const lines = files.reduce((sum, file) => sum + lineCount(path.join(root, file)), 0);
    if (lines > budget.limit) warnings.push({ label: budget.label, items: [{ file: budget.files.join(', '), lines, limit: budget.limit }] });
  }
}

for (const [file, limit] of growthCaps) {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) continue;
  const lines = lineCount(absolute);
  if (lines > limit) failures.push({ label: 'hotspot grew beyond calibrated growth cap', items: [{ file, lines, limit }] });
}

for (const [pattern, limit, label] of totalGrowthCaps) {
  const files = expandFiles(pattern);
  const lines = files.reduce((sum, file) => sum + lineCount(path.join(root, file)), 0);
  if (lines > limit) failures.push({ label, items: [{ file: pattern, lines, limit }] });
}

if (strict) {
  for (const [pattern, limit, label] of strictTargetBudgets) {
    const files = expandFiles(pattern);
    const lines = files.reduce((sum, file) => sum + lineCount(path.join(root, file)), 0);
    if (lines > limit) {
      failures.push({
        label: label ? `${label} above strict debt-zero target` : `${pattern} above strict debt-zero target`,
        items: [{ file: pattern, lines, limit }]
      });
    }
  }
}

console.log('Debt budget summary:');
console.log(`  mode: ${strict ? 'strict target enforcement' : 'warning + growth-cap enforcement'}`);
console.log(`  ${warningBudgets.length} warning budgets checked`);
console.log(`  ${growthCaps.length} hotspot growth caps checked`);
console.log(`  ${totalGrowthCaps.length} total growth caps checked`);
console.log(`  ${strictTargetBudgets.length} strict target budgets available`);

if (warnings.length) {
  console.warn('\nDebt budget warnings:');
  for (const warning of warnings) {
    console.warn(`\n${warning.label}:`);
    for (const item of warning.items) console.warn(formatItem(item));
  }
} else {
  console.log('\nDebt budget warnings: none');
}

if (failures.length) {
  console.error('\nDebt budget failures:');
  for (const failure of failures) {
    console.error(`\n${failure.label}:`);
    for (const item of failure.items) console.error(formatItem(item));
  }
  process.exit(1);
}

console.log('\nDebt budget check passed.');
