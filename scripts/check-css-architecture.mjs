import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const stylesDir = path.join(root, 'src', 'styles');
const globalPath = path.join(stylesDir, 'global.css');
const layersDir = path.join(stylesDir, 'layers');
const expectedImports = [
  './tailwind.css',
  './layers/base.css',
  './layers/motion.css',
  './layers/app-shell.css',
  './layers/app-primitives.css',
  './layers/mobile.css'
];

function fail(message) {
  console.error(`CSS architecture check failed: ${message}`);
  process.exit(1);
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

if (!fs.existsSync(globalPath)) fail('src/styles/global.css is missing.');
if (!fs.existsSync(layersDir)) fail('src/styles/layers directory is missing.');

const globalLines = read(globalPath)
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);
const imports = globalLines.map((line) => {
  const match = line.match(/^@import\s+["'](.+)["'];$/);
  if (!match) fail(`global.css should only contain @import rules, found: ${line}`);
  return match[1];
});

if (imports.join('\n') !== expectedImports.join('\n')) {
  fail(`global.css imports are out of order. Expected:\n${expectedImports.join('\n')}\nActual:\n${imports.join('\n')}`);
}

const layerFiles = fs.readdirSync(layersDir).filter((name) => name.endsWith('.css')).sort();
const importedLayerFiles = expectedImports
  .filter((entry) => entry.startsWith('./layers/'))
  .map((entry) => path.basename(entry))
  .sort();
if (layerFiles.join('\n') !== importedLayerFiles.join('\n')) {
  fail(`layers directory should match imported layers. Expected ${importedLayerFiles.join(', ')}, got ${layerFiles.join(', ')}`);
}

const stats = [];
let totalImportant = 0;
let totalLayerLines = 0;
for (const file of layerFiles) {
  const filePath = path.join(layersDir, file);
  const text = read(filePath);
  const open = (text.match(/{/g) ?? []).length;
  const close = (text.match(/}/g) ?? []).length;
  if (open !== close) fail(`${file} has unbalanced braces: ${open} { vs ${close} }.`);
  const lines = text.split(/\r?\n/).length;
  const important = (text.match(/!important/g) ?? []).length;
  totalLayerLines += lines;
  totalImportant += important;
  if (lines > 3000) fail(`${file} is too large (${lines} lines). Split it before adding more CSS.`);
  stats.push({ file, lines, important });
}

const tailwindPath = path.join(stylesDir, 'tailwind.css');
const tailwindText = read(tailwindPath);
for (const directive of ['@tailwind base;', '@tailwind components;', '@tailwind utilities;']) {
  if (!tailwindText.includes(directive)) fail(`src/styles/tailwind.css is missing ${directive}`);
}

if (totalImportant > 80) fail(`too many !important usages remain after scoped migration (${totalImportant}, limit 80).`);

const mobilePath = path.join(layersDir, 'mobile.css');
const mobileText = read(mobilePath);
if (mobileText.includes('@layer')) fail('mobile.css should stay an unlayered final override quarantine during scoped migration.');

console.log('CSS architecture summary:');
console.log(`  ${imports.length} CSS entry imports`);
console.log(`  ${layerFiles.length} CSS layer files`);
console.log(`  ${totalLayerLines} layer lines`);
console.log(`  ${totalImportant} !important usages outside the entrypoint`);
for (const item of stats) {
  console.log(`  ${String(item.lines).padStart(4)} lines · ${String(item.important).padStart(3)} !important · ${item.file}`);
}
console.log('CSS architecture check passed.');
