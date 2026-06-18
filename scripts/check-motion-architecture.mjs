#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const forbiddenTransitionProperties = [
  'width',
  'height',
  'min-width',
  'max-width',
  'min-height',
  'max-height',
  'padding',
  'padding-left',
  'padding-right',
  'padding-top',
  'padding-bottom',
  'margin',
  'margin-left',
  'margin-right',
  'margin-top',
  'margin-bottom',
  'top',
  'right',
  'bottom',
  'left',
  'inset',
  'grid-template',
  'grid-template-rows',
  'grid-template-columns',
  'backdrop-filter',
  'filter'
];

const ignoredDirs = new Set(['.git', 'node_modules', 'dist', 'artifacts', 'coverage', '.vite']);

function fail(message) {
  console.error(`Motion architecture check failed: ${message}`);
  process.exit(1);
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.env.example') continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) walk(absolute, files);
      continue;
    }
    if (entry.isFile() && (/\.module\.css$/.test(entry.name) || entry.name.endsWith('.css'))) {
      files.push(absolute);
    }
  }
  return files;
}

function declarations(text) {
  const matches = [];
  const regex = /transition\s*:\s*([^;]+);/g;
  let match;
  while ((match = regex.exec(text))) matches.push({ value: match[1], index: match.index });
  return matches;
}

function lineAt(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

const globalCss = fs.readFileSync(path.join(root, 'src/styles/global.css'), 'utf8');
if (!globalCss.includes('./layers/motion.css')) fail('src/styles/global.css must import ./layers/motion.css.');

const motionCssPath = path.join(root, 'src/styles/layers/motion.css');
if (!fs.existsSync(motionCssPath)) fail('src/styles/layers/motion.css is missing.');
const motionCss = fs.readFileSync(motionCssPath, 'utf8');
for (const required of ['--motion-duration-fast', '--motion-duration-medium', '--motion-duration-slow', 'prefers-reduced-motion', '--ambient-animation-play-state']) {
  if (!motionCss.includes(required)) fail(`motion.css is missing ${required}.`);
}

const violations = [];
for (const file of walk(path.join(root, 'src'))) {
  const text = fs.readFileSync(file, 'utf8');
  for (const declaration of declarations(text)) {
    const transition = declaration.value.toLowerCase();
    for (const property of forbiddenTransitionProperties) {
      const escaped = property.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const propertyPattern = new RegExp(`(^|[,\\s])${escaped}(?=\\s|,|$)`);
      if (propertyPattern.test(transition)) {
        violations.push({
          file: path.relative(root, file).replace(/\\/g, '/'),
          line: lineAt(text, declaration.index),
          property,
          transition: declaration.value.trim()
        });
      }
    }
  }
}

if (violations.length) {
  console.error('Layout/filter-heavy transitions are not allowed in motion-sensitive CSS:');
  for (const item of violations) {
    console.error(`  - ${item.file}:${item.line} transitions ${item.property}: ${item.transition}`);
  }
  process.exit(1);
}

console.log('Motion architecture summary:');
console.log('  motion.css imported');
console.log('  reduced-motion fallback present');
console.log('  ambient animation pause token present');
console.log('  no layout/filter-heavy transition declarations found');
console.log('Motion architecture check passed.');
