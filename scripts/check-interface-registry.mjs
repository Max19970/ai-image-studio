#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcDir = path.join(root, 'src');
const featuresDir = path.join(srcDir, 'features');
const placementsDir = path.join(srcDir, 'interface', 'placements');
const legacySlotsDir = path.join(srcDir, 'interface', 'slots');

function walk(dir, predicate = () => true) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, predicate));
    else if (predicate(full)) out.push(full);
  }
  return out;
}

function rel(file) {
  return path.relative(root, file).replaceAll(path.sep, '/');
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/.*$/gm, '$1');
}

function matchStringProperty(source, property) {
  const match = stripComments(source).match(new RegExp(`${property}\\s*:\\s*['\"]([^'\"]+)['\"]`));
  return match?.[1] ?? null;
}

function matchAllStringProperty(source, property) {
  const pattern = new RegExp(`${property}\\s*:\\s*['\"]([^'\"]+)['\"]`, 'g');
  const result = [];
  const clean = stripComments(source);
  for (const match of clean.matchAll(pattern)) result.push(match[1]);
  return result;
}

function duplicateEntries(items) {
  const seen = new Map();
  const duplicates = [];
  for (const item of items) {
    const current = seen.get(item.id);
    if (current) duplicates.push({ id: item.id, first: current.file, second: item.file });
    else seen.set(item.id, item);
  }
  return duplicates;
}

const definitionFiles = walk(featuresDir, (file) => file.endsWith('/definition.ts'));
const definitions = definitionFiles.map((file) => ({
  file: rel(file),
  id: matchStringProperty(fs.readFileSync(file, 'utf8'), 'id')
}));

const placementFiles = walk(placementsDir, (file) => file.endsWith('.placement.ts'));
const placements = placementFiles.flatMap((file) => {
  const source = fs.readFileSync(file, 'utf8');
  const ids = matchAllStringProperty(source, 'id');
  const slots = matchAllStringProperty(source, 'slot');
  const uses = matchAllStringProperty(source, 'use');
  const max = Math.max(ids.length, slots.length, uses.length);
  return Array.from({ length: max }, (_, index) => ({
    file: rel(file),
    id: ids[index] ?? null,
    slot: slots[index] ?? null,
    use: uses[index] ?? null
  }));
});

const definitionIds = new Set(definitions.map((item) => item.id).filter(Boolean));
const missingDefinitionIds = definitions.filter((item) => !item.id);
const duplicateDefinitionIds = duplicateEntries(definitions.filter((item) => item.id));
const missingPlacementFields = placements.filter((item) => !item.id || !item.slot || !item.use);
const missingPlacementTargets = placements.filter((item) => item.use && !definitionIds.has(item.use));
const duplicatePlacementIds = duplicateEntries(placements.filter((item) => item.id));
const slots = Array.from(new Set(placements.map((item) => item.slot).filter(Boolean))).sort();
const reusableDefinitionIds = Array.from(
  placements.reduce((map, placement) => {
    if (!placement.use) return map;
    map.set(placement.use, (map.get(placement.use) ?? 0) + 1);
    return map;
  }, new Map())
).filter(([, count]) => count > 1).sort(([a], [b]) => a.localeCompare(b));

const legacySlotRuntimeFiles = walk(legacySlotsDir, (file) => !file.endsWith('/types.ts') && !file.endsWith('types.ts'))
  .filter((file) => !rel(file).endsWith('src/interface/slots/types.ts'));

const issues = [
  ...missingDefinitionIds.map((item) => `Definition without stable id: ${item.file}`),
  ...duplicateDefinitionIds.map((item) => `Duplicate definition id "${item.id}": ${item.first} and ${item.second}`),
  ...missingPlacementFields.map((item) => `Placement with missing id/slot/use in ${item.file}: ${JSON.stringify(item)}`),
  ...duplicatePlacementIds.map((item) => `Duplicate placement id "${item.id}": ${item.first} and ${item.second}`),
  ...missingPlacementTargets.map((item) => `Placement "${item.id}" references missing definition "${item.use}" in ${item.file}`),
  ...legacySlotRuntimeFiles.map((file) => `Legacy slot runtime file is not allowed after Stage 4: ${rel(file)}`)
];

console.log('Interface registry summary:');
console.log(`${String(definitions.length).padStart(5)} definitions`);
console.log(`${String(placements.length).padStart(5)} placements`);
console.log(`${String(slots.length).padStart(5)} slots`);
console.log(`${String(reusableDefinitionIds.length).padStart(5)} reusable definitions used by multiple placements`);
console.log(`${String(legacySlotRuntimeFiles.length).padStart(5)} legacy slot runtime files`);

if (reusableDefinitionIds.length > 0) {
  console.log('\nReusable definitions:');
  for (const [id, count] of reusableDefinitionIds) console.log(`  ${id} (${count} placements)`);
}

if (issues.length > 0) {
  console.error('\nInterface registry check failed:');
  for (const issue of issues) console.error(`  - ${issue}`);
  process.exit(1);
}

console.log('\nInterface registry check passed.');
