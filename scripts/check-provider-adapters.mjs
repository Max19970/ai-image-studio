#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { providerServerManifests } from '../server/providers/registry.ts';
import { providerClientManifests } from '../src/entities/provider/registry.ts';

const root = process.cwd();

function fail(message) {
  console.error(`Provider adapter check failed: ${message}`);
  process.exit(1);
}

function rel(filePath) {
  return path.relative(root, filePath).replaceAll(path.sep, '/');
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function linesOf(filePath) {
  return read(filePath).split('\n').length;
}

function collectSourceFiles(basePath) {
  const entries = fs.readdirSync(basePath, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(basePath, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(fullPath);
    return /\.(ts|tsx|mjs|js)$/.test(entry.name) ? [fullPath] : [];
  });
}

function assertFiles(basePath, files, manifestId) {
  const base = path.join(root, basePath);
  const missing = files.filter((file) => !fs.existsSync(path.join(base, file)));
  if (missing.length) fail(`${manifestId} missing files under ${basePath}: ${missing.join(', ')}`);
}

function assertUniqueIds(manifests, label) {
  const ids = manifests.map((manifest) => manifest.id);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length) fail(`${label} manifests contain duplicate ids: ${[...new Set(duplicates)].join(', ')}`);
}

function assertPhrases(source, phrases, message) {
  for (const phrase of phrases ?? []) {
    if (!source.includes(phrase)) fail(`${message}: missing phrase ${phrase}`);
  }
}

function assertForbiddenPhrases(source, phrases, message) {
  for (const phrase of phrases ?? []) {
    if (source.includes(phrase)) fail(`${message}: forbidden phrase ${phrase}`);
  }
}

function assertArchitecture(manifest, side) {
  const { architecture } = manifest;
  assertFiles(architecture.basePath, architecture.requiredModules, manifest.id);

  const compositionPath = path.join(root, architecture.basePath, architecture.compositionFile);
  if (!fs.existsSync(compositionPath)) fail(`${manifest.id} ${side} composition file is missing: ${rel(compositionPath)}`);

  const compositionSource = read(compositionPath);
  const compositionLines = linesOf(compositionPath);
  if (compositionLines > architecture.maxCompositionLines) {
    fail(`${manifest.id} ${side} composition file ${rel(compositionPath)} is too large (${compositionLines} lines, limit ${architecture.maxCompositionLines}).`);
  }
  assertPhrases(compositionSource, architecture.requiredCompositionPhrases, `${manifest.id} ${side} composition file ${rel(compositionPath)}`);
  assertForbiddenPhrases(compositionSource, architecture.forbiddenCompositionPhrases, `${manifest.id} ${side} composition file ${rel(compositionPath)}`);

  for (const check of architecture.sourceChecks ?? []) {
    const combinedSource = check.files
      .map((file) => read(path.join(root, architecture.basePath, file)))
      .join('\n');
    assertPhrases(combinedSource, check.requiredPhrases, `${manifest.id} ${side} source check ${check.files.join(', ')}`);
    assertForbiddenPhrases(combinedSource, check.forbiddenPhrases, `${manifest.id} ${side} source check ${check.files.join(', ')}`);
  }
}

function assertRegistryCompositionRoot() {
  const serverRegistry = read(path.join(root, 'server/providers/registry.ts'));
  const clientRegistry = read(path.join(root, 'src/entities/provider/registry.ts'));
  if (!serverRegistry.includes('providerServerManifests')) fail('server provider registry should compose providerServerManifests.');
  if (!clientRegistry.includes('providerClientManifests')) fail('client provider registry should compose providerClientManifests.');
  if (serverRegistry.includes('/adapter')) fail('server provider registry should register provider manifests, not adapter modules directly.');
  if (clientRegistry.includes('/definition') && !clientRegistry.includes('export {')) {
    fail('client provider registry should register provider manifests, not definition modules directly.');
  }
}

function assertClientServerAlignment() {
  assertUniqueIds(providerServerManifests, 'server');
  assertUniqueIds(providerClientManifests, 'client');

  const serverById = new Map(providerServerManifests.map((manifest) => [manifest.id, manifest]));
  const clientById = new Map(providerClientManifests.map((manifest) => [manifest.id, manifest]));

  const missingClient = providerServerManifests.map((manifest) => manifest.id).filter((id) => !clientById.has(id));
  const missingServer = providerClientManifests.map((manifest) => manifest.id).filter((id) => !serverById.has(id));
  if (missingClient.length) fail(`server manifests without client manifests: ${missingClient.join(', ')}`);
  if (missingServer.length) fail(`client manifests without server manifests: ${missingServer.join(', ')}`);

  for (const clientManifest of providerClientManifests) {
    const serverManifest = serverById.get(clientManifest.id);
    if (!serverManifest) continue;
    if (serverManifest.adapter.id !== serverManifest.id) fail(`${serverManifest.id} server manifest id must match adapter id ${serverManifest.adapter.id}.`);
    if (clientManifest.definition.id !== clientManifest.id) fail(`${clientManifest.id} client manifest id must match definition id ${clientManifest.definition.id}.`);
    if (clientManifest.definition.id !== serverManifest.adapter.id) fail(`${clientManifest.id} client/server adapter ids are not aligned.`);
    if (JSON.stringify(clientManifest.definition.capabilities) !== JSON.stringify(serverManifest.adapter.capabilities)) {
      fail(`${clientManifest.id} client/server capabilities are not aligned.`);
    }
    if (JSON.stringify(clientManifest.definition.resources.kinds) !== JSON.stringify(serverManifest.adapter.resources.kinds)) {
      fail(`${clientManifest.id} client/server resource kinds are not aligned.`);
    }
  }
}

function assertSurfaceRegistries() {
  const surfaceRegistrySource = read(path.join(root, 'src/entities/generation-params/surfaceRegistry.ts'));
  const requestSurfaceRegistrySource = read(path.join(root, 'src/entities/generation-params/requestSurface.ts'));
  if (!surfaceRegistrySource.includes('providerGenerationSurfaces')) fail('generation surface registry should expose providerGenerationSurfaces.');
  if (!requestSurfaceRegistrySource.includes('providerGenerationRequestSurfaces')) fail('request surface registry should expose providerGenerationRequestSurfaces.');

  const generationParamSources = collectSourceFiles(path.join(root, 'src/entities/generation-params'))
    .map(read)
    .join('\n');
  for (const manifest of providerClientManifests) {
    const surfaceId = manifest.definition.generationSurface.id;
    if (!generationParamSources.includes(surfaceId)) {
      fail(`${manifest.id} generation surface ${surfaceId} has no generation/request surface implementation source.`);
    }
  }
}

function assertGlobalContracts() {
  const serverTypesSource = read(path.join(root, 'server/providers/types.ts'));
  if (!serverTypesSource.includes('settingsSchema: z.ZodType<ProviderSettings>')) {
    fail('server ProviderAdapterDefinition should expose an adapter-owned settingsSchema.');
  }
  for (const phrase of ['capabilities: ProviderRuntimeCapabilities', 'resources: ProviderResourceDescriptor', 'fetchResources?']) {
    if (!serverTypesSource.includes(phrase)) fail(`server ProviderAdapterDefinition missing v2 contract phrase: ${phrase}`);
  }

  const providerTypesSource = read(path.join(root, 'src/entities/provider/types.ts'));
  if (!providerTypesSource.includes('generationParams: ProviderGenerationParamProfile')) {
    fail('client ProviderAdapterDefinition should expose an adapter-owned generation parameter profile.');
  }
  for (const phrase of ['capabilities: ProviderRuntimeCapabilities', 'resources: ProviderResourceDescriptor', 'generationSurface: ProviderGenerationSurfaceDefinition', 'detailDescriptor: ProviderDetailDescriptorDefinition']) {
    if (!providerTypesSource.includes(phrase)) fail(`client ProviderAdapterDefinition missing v2 contract phrase: ${phrase}`);
  }

  const contractDoc = path.join(root, 'docs/PROVIDER_ADAPTER_CONTRACT.md');
  if (!fs.existsSync(contractDoc)) fail('missing docs/PROVIDER_ADAPTER_CONTRACT.md');
  const contractText = read(contractDoc).toLowerCase();
  for (const phrase of ['server adapter contract', 'client adapter contract', 'adapter-specific settings', 'generation parameter profile', 'mock adapter candidate', 'provider resources', 'generation surface', 'detail descriptor', 'provider manifest']) {
    if (!contractText.includes(phrase)) fail(`provider contract docs missing phrase: ${phrase}`);
  }
}

assertRegistryCompositionRoot();
assertClientServerAlignment();
for (const manifest of providerServerManifests) assertArchitecture(manifest, 'server');
for (const manifest of providerClientManifests) assertArchitecture(manifest, 'client');
assertSurfaceRegistries();
assertGlobalContracts();

console.log('Provider adapter architecture summary:');
console.log(`  ${providerServerManifests.length} server provider manifests`);
console.log(`  ${providerClientManifests.length} client provider manifests`);
for (const manifest of providerServerManifests) {
  const compositionPath = path.join(root, manifest.architecture.basePath, manifest.architecture.compositionFile);
  console.log(`  ${manifest.id}: ${manifest.architecture.requiredModules.length} server modules, ${linesOf(compositionPath)} lines in ${rel(compositionPath)}`);
}
for (const manifest of providerClientManifests) {
  console.log(`  ${manifest.id}: ${manifest.architecture.requiredModules.length} client modules, surface ${manifest.definition.generationSurface.id}`);
}
console.log('Provider adapter check passed.');
