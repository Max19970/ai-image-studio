#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const layoutProperties = `width height min-width max-width min-height max-height padding padding-left padding-right padding-top padding-bottom margin margin-left margin-right margin-top margin-bottom top right bottom left inset grid-template grid-template-rows grid-template-columns`.split(' ');
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
    } else if (entry.isFile() && entry.name.endsWith('.css')) files.push(absolute);
  }
  return files;
}

function declarations(text, property) {
  const matches = [];
  const regex = new RegExp(`${property}\\s*:\\s*([^;]+);`, 'g');
  let match;
  while ((match = regex.exec(text))) matches.push({ value: match[1].trim(), index: match.index });
  return matches;
}

const lineAt = (text, index) => text.slice(0, index).split(/\r?\n/).length;
function containsProperty(value, property) {
  const escaped = property.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  return new RegExp(`(^|[,\\s])${escaped}(?=\\s|,|$)`, 'i').test(value);
}

function literalDurations(value) {
  const durations = [];
  const regex = /(^|[\s,(])(-?\d*\.?\d+)(ms|s)(?=[\s,)]|$)/gi;
  let match;
  while ((match = regex.exec(value))) {
    const amount = Number(match[2]);
    durations.push(match[3].toLowerCase() === 's' ? amount * 1000 : amount);
  }
  return durations;
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
const layoutTransitions = [];
const addViolation = (file, line, message) => violations.push({ file, line, message });
for (const file of walk(path.join(root, 'src'))) {
  const text = fs.readFileSync(file, 'utf8');
  const relativeFile = path.relative(root, file).replace(/\\/g, '/');

  for (const declaration of declarations(text, 'transition')) {
    const { value: transition, index } = declaration;
    const line = lineAt(text, index);
    if (containsProperty(transition, 'all')) addViolation(relativeFile, line, `uses transition: all (${transition})`);
    const excessiveDuration = literalDurations(transition).find((duration) => duration > 500);
    if (excessiveDuration !== undefined) addViolation(relativeFile, line, `uses a ${excessiveDuration}ms literal transition duration (${transition})`);
    const properties = layoutProperties.filter((property) => containsProperty(transition, property));
    if (properties.length) layoutTransitions.push({ file: relativeFile, line, properties });
  }

  for (const declaration of declarations(text, 'transition-property')) {
    if (containsProperty(declaration.value, 'all')) addViolation(relativeFile, lineAt(text, declaration.index), `uses transition-property: all (${declaration.value})`);
  }

  for (const declaration of declarations(text, 'will-change')) {
    const line = lineAt(text, declaration.index);
    if (containsProperty(declaration.value, 'all')) {
      addViolation(relativeFile, line, `uses will-change: all (${declaration.value})`);
      continue;
    }
    const properties = layoutProperties.filter((property) => containsProperty(declaration.value, property));
    if (properties.length) addViolation(relativeFile, line, `pre-promotes layout properties with will-change (${properties.join(', ')})`);
  }
}

if (violations.length) {
  console.error('Motion policy violations:');
  for (const item of violations) console.error(`  - ${item.file}:${item.line} ${item.message}`);
  process.exit(1);
}

console.log('Motion architecture summary:');
for (const message of [
  'motion.css imported',
  'reduced-motion fallback present',
  'ambient animation pause token present',
  'no transition: all declarations',
  'no excessive literal transition durations',
  'no layout properties pre-promoted with will-change'
]) console.log(`  ${message}`);
console.log(`  ${layoutTransitions.length} explicit layout transition(s) allowed for behavioral verification`);
for (const item of layoutTransitions) console.log(`    - ${item.file}:${item.line} ${item.properties.join(', ')}`);
console.log('Motion architecture check passed.');
