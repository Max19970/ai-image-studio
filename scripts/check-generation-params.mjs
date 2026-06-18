#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const fieldsDir = path.join(root, 'src', 'entities', 'generation-params', 'fields');
const placementsFile = path.join(root, 'src', 'entities', 'generation-params', 'placements', 'composer.parameters.placement.ts');
const defaultsFile = path.join(root, 'src', 'data', 'studio.defaults.json');
const localeFiles = ['en', 'ru'].map((locale) => path.join(root, 'src', 'shared', 'i18n', 'locales', locale, 'params.json'));

function rel(file) {
  return path.relative(root, file).replaceAll(path.sep, '/');
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function readJson(file) {
  return JSON.parse(read(file));
}

function matchStringProperty(source, property) {
  const match = source.match(new RegExp(`${property}\\s*:\\s*['\"]([^'\"]+)['\"]`));
  return match?.[1] ?? null;
}

function matchAllStringProperty(source, property) {
  return [...source.matchAll(new RegExp(`${property}\\s*:\\s*['\"]([^'\"]+)['\"]`, 'g'))].map((match) => match[1]);
}

function matchStringArrayProperty(source, property) {
  const match = source.match(new RegExp(`${property}\\s*:\\s*\\[([\\s\\S]*?)\\]`));
  if (!match) return [];
  return [...match[1].matchAll(/['"]([^'"]+)['"]/g)].map((item) => item[1]);
}

function lineNumbersFor(source, pattern) {
  return source
    .split(/\r?\n/)
    .map((line, index) => ({ line, index: index + 1 }))
    .filter(({ line }) => pattern.test(line))
    .map(({ index }) => index);
}

const defaults = readJson(defaultsFile).imageParams ?? {};
const imageParamKeys = new Set(Object.keys(defaults));
const localeDictionaries = localeFiles.map((file) => ({ file: rel(file), dictionary: readJson(file) }));

const folders = fs.readdirSync(fieldsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== 'shared')
  .map((entry) => path.join(fieldsDir, entry.name))
  .sort();

const modules = folders.map((folder) => {
  const paramFile = path.join(folder, 'param.ts');
  const definitionFile = path.join(folder, 'definition.ts');
  const paramSource = fs.existsSync(paramFile) ? read(paramFile) : '';
  const definitionSource = fs.existsSync(definitionFile) ? read(definitionFile) : '';
  const copyLabelKeys = [...paramSource.matchAll(/labelKey\s*:\s*['"]([^'"]+)['"]/g)].map((match) => match[1]);
  const copyDescriptionKeys = [...paramSource.matchAll(/descriptionKey\s*:\s*['"]([^'"]+)['"]/g)].map((match) => match[1]);
  const optionLabelKeys = [...paramSource.matchAll(/labelKey\s*:\s*['"]([^'"]+)['"]/g)].map((match) => match[1]);
  return {
    folder: rel(folder),
    folderName: path.basename(folder),
    paramFile: fs.existsSync(paramFile) ? rel(paramFile) : null,
    definitionFile: fs.existsSync(definitionFile) ? rel(definitionFile) : null,
    paramSource,
    definitionSource,
    paramId: matchStringProperty(paramSource, 'id'),
    fieldId: matchStringProperty(definitionSource, 'id'),
    fieldDefinitionId: matchStringProperty(paramSource, 'fieldDefinitionId'),
    placementIds: matchStringArrayProperty(paramSource, 'placementIds'),
    i18nNamespace: matchStringProperty(paramSource, 'i18nNamespace'),
    stateKeys: matchStringArrayProperty(paramSource, 'stateKeys'),
    snapshotKeys: matchStringArrayProperty(paramSource, 'snapshotKeys'),
    payloadKeys: matchStringArrayProperty(paramSource, 'payloadKeys'),
    includeKeys: matchAllStringProperty(paramSource, 'includeKey'),
    hasPayloadSerializer: /openAiCompatiblePayload\s*:/.test(paramSource),
    hasNormalize: /normalize\s*:/.test(paramSource),
    hasCopy: /copy\s*:/.test(paramSource),
    usesDefineHelper: /defineGenerationParam\s*\(/.test(paramSource),
    copyAndOptionI18nKeys: [...new Set([...copyLabelKeys, ...copyDescriptionKeys, ...optionLabelKeys])]
  };
});

const placementSource = read(placementsFile);
const placementRecords = [...placementSource.matchAll(/\{\s*id\s*:\s*['"]([^'"]+)['"][\s\S]*?use\s*:\s*['"]([^'"]+)['"][\s\S]*?\}/g)]
  .map((match) => ({ id: match[1], use: match[2] }));
const placementIds = placementRecords.map((placement) => placement.id);
const placementById = new Map(placementRecords.map((placement) => [placement.id, placement]));
const placementUses = placementRecords.map((placement) => placement.use);
const fieldIds = modules.map((module) => module.fieldId).filter(Boolean);
const fieldOwners = new Map(modules.map((module) => [module.fieldDefinitionId, module]));

const duplicateFieldIds = fieldIds.filter((id, index) => fieldIds.indexOf(id) !== index);
const duplicatePlacementIds = placementIds.filter((id, index) => placementIds.indexOf(id) !== index);
const missingPlacementTargets = placementUses.filter((use) => !fieldIds.includes(use));
const unusedFieldIds = fieldIds.filter((id) => !placementUses.includes(id));
const unownedFieldIds = fieldIds.filter((id) => !fieldOwners.has(id));
const unownedPlacementIds = placementIds.filter((id) => !modules.some((module) => module.placementIds.includes(id)));
const duplicateLogicalIds = modules.map((module) => module.paramId).filter(Boolean).filter((id, index, ids) => ids.indexOf(id) !== index);

const issues = [
  ...modules.filter((module) => !module.paramFile).map((module) => `Missing param.ts in ${module.folder}`),
  ...modules.filter((module) => !module.definitionFile).map((module) => `Missing definition.ts in ${module.folder}`),
  ...modules.filter((module) => module.paramFile && !module.usesDefineHelper).map((module) => `Param module does not use defineGenerationParam: ${module.paramFile}`),
  ...modules.filter((module) => module.paramFile && !module.paramId).map((module) => `Missing logical param id in ${module.paramFile}`),
  ...modules.filter((module) => module.definitionFile && !module.fieldId).map((module) => `Missing field definition id in ${module.definitionFile}`),
  ...modules.filter((module) => module.paramFile && !module.fieldDefinitionId).map((module) => `Missing fieldDefinitionId in ${module.paramFile}`),
  ...modules.filter((module) => module.paramFile && !module.placementIds.length).map((module) => `Missing placementIds in ${module.paramFile}`),
  ...modules.filter((module) => module.paramFile && !module.i18nNamespace).map((module) => `Missing i18nNamespace in ${module.paramFile}`),
  ...modules.filter((module) => module.paramFile && !module.stateKeys.length).map((module) => `Missing stateKeys in ${module.paramFile}`),
  ...modules.filter((module) => module.paramFile && !module.hasCopy).map((module) => `Missing copy metadata in ${module.paramFile}`),
  ...modules.flatMap((module) => module.stateKeys.filter((key) => !imageParamKeys.has(key)).map((key) => `Unknown ImageParams state key "${key}" in ${module.paramFile}`)),
  ...modules.flatMap((module) => module.snapshotKeys.filter((key) => !module.stateKeys.includes(key)).map((key) => `Snapshot key "${key}" is not owned by stateKeys in ${module.paramFile}`)),
  ...modules.flatMap((module) => module.includeKeys.filter((key) => !module.stateKeys.includes(key)).map((key) => `includeKey "${key}" is not owned by stateKeys in ${module.paramFile}`)),
  ...modules.filter((module) => module.payloadKeys.length > 0 && !module.hasPayloadSerializer).map((module) => `payloadKeys declared without openAiCompatiblePayload in ${module.paramFile}`),
  ...modules.filter((module) => module.includeKeys.length > 0 && module.payloadKeys.length === 0).map((module) => `includeKey declared without payloadKeys in ${module.paramFile}`),
  ...modules.filter((module) => module.fieldDefinitionId && module.fieldId && module.fieldDefinitionId !== module.fieldId).map((module) => `fieldDefinitionId ${module.fieldDefinitionId} does not match definition id ${module.fieldId} in ${module.paramFile}`),
  ...modules.flatMap((module) => module.placementIds.filter((id) => !placementById.has(id)).map((id) => `Declared placementId "${id}" does not exist for ${module.paramFile}`)),
  ...modules.flatMap((module) => module.placementIds.filter((id) => placementById.has(id) && placementById.get(id).use !== module.fieldDefinitionId).map((id) => `Declared placementId "${id}" uses ${placementById.get(id).use}, expected ${module.fieldDefinitionId}`)),
  ...duplicateLogicalIds.map((id) => `Duplicate logical generation parameter id: ${id}`),
  ...duplicateFieldIds.map((id) => `Duplicate generation parameter field id: ${id}`),
  ...duplicatePlacementIds.map((id) => `Duplicate generation parameter placement id: ${id}`),
  ...missingPlacementTargets.map((id) => `Placement references missing generation parameter field definition: ${id}`),
  ...unusedFieldIds.map((id) => `Generation parameter field definition is not placed anywhere: ${id}`),
  ...unownedFieldIds.map((id) => `Generation parameter field definition is not owned by a logical param: ${id}`),
  ...unownedPlacementIds.map((id) => `Generation parameter placement is not owned by a logical param: ${id}`),
  ...modules.flatMap((module) => module.copyAndOptionI18nKeys.flatMap((key) => localeDictionaries.filter(({ dictionary }) => !(key in dictionary)).map(({ file }) => `Missing i18n key "${key}" in ${file} referenced from ${module.paramFile}`)))
];

const payloadCount = modules.filter((module) => module.hasPayloadSerializer).length;
const snapshotCount = modules.filter((module) => module.snapshotKeys.length > 0).length;
const normalizedCount = modules.filter((module) => module.hasNormalize).length;
const linkLineNumbers = lineNumbersFor(placementSource, /use\s*:/);

console.log('Generation parameter registry summary:');
console.log(`${String(modules.length).padStart(5)} logical parameter modules`);
console.log(`${String(fieldIds.length).padStart(5)} field definitions`);
console.log(`${String(placementIds.length).padStart(5)} field placements`);
console.log(`${String(payloadCount).padStart(5)} OpenAI-compatible payload serializers`);
console.log(`${String(snapshotCount).padStart(5)} snapshot participants`);
console.log(`${String(normalizedCount).padStart(5)} normalization participants`);
console.log(`${String(modules.filter((module) => module.fieldDefinitionId).length).padStart(5)} logical→UI links`);
console.log(`${String(modules.filter((module) => module.placementIds.length).length).padStart(5)} logical→placement owner links`);

if (issues.length > 0) {
  console.error('\nGeneration parameter registry check failed:');
  for (const issue of issues) console.error(`  - ${issue}`);
  if (linkLineNumbers.length) console.error(`\nPlacement use declarations found at ${rel(placementsFile)}:${linkLineNumbers.join(',')}`);
  process.exit(1);
}

console.log('\nGeneration parameter registry check passed.');
