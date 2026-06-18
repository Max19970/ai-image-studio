#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredOpenAiServerModules = [
  'adapter.ts',
  'auth.ts',
  'endpoints.ts',
  'errorNormalizer.ts',
  'fixtureImage.ts',
  'multipartEdit.ts',
  'probeSuite.ts',
  'probeClassifier.ts',
  'requestHandlers.ts',
  'settingsSchema.ts',
  'upstreamClient.ts'
];
const requiredOpenAiClientModules = [
  'definition.ts',
  'parameterProfile.ts',
  'requestAdapter.ts',
  'responseAdapter.ts',
  'settingsSchema.ts'
];

function fail(message) {
  console.error(`Provider adapter check failed: ${message}`);
  process.exit(1);
}

function linesOf(filePath) {
  return fs.readFileSync(filePath, 'utf8').split('\n').length;
}

function assertFiles(base, files) {
  const missing = files.filter((file) => !fs.existsSync(path.join(base, file)));
  if (missing.length) fail(`missing files under ${path.relative(root, base)}: ${missing.join(', ')}`);
}

const serverOpenAi = path.join(root, 'server/providers/openai-compatible');
const clientOpenAi = path.join(root, 'src/providers/openai-compatible');
assertFiles(serverOpenAi, requiredOpenAiServerModules);
assertFiles(clientOpenAi, requiredOpenAiClientModules);

const adapterPath = path.join(serverOpenAi, 'adapter.ts');
const adapterSource = fs.readFileSync(adapterPath, 'utf8');
if (adapterSource.includes('node:zlib') || adapterSource.includes('makePng(') || adapterSource.includes('fetch(')) {
  fail('server openai-compatible/adapter.ts contains implementation details that should live in submodules.');
}
if (linesOf(adapterPath) > 80) {
  fail(`server openai-compatible/adapter.ts is too large (${linesOf(adapterPath)} lines). Keep it as a composition file.`);
}

const registrySource = fs.readFileSync(path.join(root, 'server/providers/registry.ts'), 'utf8');
if (!registrySource.includes('ProviderAdapterDefinition')) {
  fail('server provider registry should keep adapter definitions typed as ProviderAdapterDefinition.');
}

const serverTypesSource = fs.readFileSync(path.join(root, 'server/providers/types.ts'), 'utf8');
if (!serverTypesSource.includes('settingsSchema: z.ZodType<ProviderSettings>')) {
  fail('server ProviderAdapterDefinition should expose an adapter-owned settingsSchema.');
}
if (!adapterSource.includes('settingsSchema: openAiCompatibleProviderSettingsSchema')) {
  fail('server OpenAI-compatible adapter should register its settings schema in adapter.ts.');
}

const clientDefinitionSource = fs.readFileSync(path.join(clientOpenAi, 'definition.ts'), 'utf8');
if (!clientDefinitionSource.includes('settingsFields: openAiCompatibleSettingsFields')) {
  fail('client OpenAI-compatible provider definition should register adapter-owned settings fields.');
}
if (!clientDefinitionSource.includes('generationParams: openAiCompatibleGenerationParamProfile')) {
  fail('client OpenAI-compatible provider definition should register adapter-owned generation parameter profile.');
}
const providerTypesSource = fs.readFileSync(path.join(root, 'src/entities/provider/types.ts'), 'utf8');
if (!providerTypesSource.includes('generationParams: ProviderGenerationParamProfile')) {
  fail('client ProviderAdapterDefinition should expose an adapter-owned generation parameter profile.');
}

const contractDoc = path.join(root, 'docs/PROVIDER_ADAPTER_CONTRACT.md');
if (!fs.existsSync(contractDoc)) {
  fail('missing docs/PROVIDER_ADAPTER_CONTRACT.md');
}
const contractText = fs.readFileSync(contractDoc, 'utf8');
for (const phrase of ['server adapter contract', 'client adapter contract', 'adapter-specific settings', 'generation parameter profile', 'mock adapter candidate']) {
  if (!contractText.toLowerCase().includes(phrase)) fail(`provider contract docs missing phrase: ${phrase}`);
}

console.log('Provider adapter architecture summary:');
console.log(`  ${requiredOpenAiServerModules.length} server OpenAI-compatible modules`);
console.log(`  ${requiredOpenAiClientModules.length} client OpenAI-compatible modules`);
console.log(`  ${linesOf(adapterPath)} lines in server openai-compatible/adapter.ts`);
console.log('Provider adapter check passed.');
