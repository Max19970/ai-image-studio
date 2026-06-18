#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const scanRoots = ['src', 'server'];
const sourceExtensions = new Set(['.ts', '.tsx', '.mjs', '.js']);
const importExpressionPattern = /(?:import\s+(?:type\s+)?[^'";]*?from\s*|export\s+[^'";]*?from\s*|import\s*\(\s*)['"]([^'"]+)['"]/g;

function toPosix(filePath) {
  return filePath.split(path.sep).join('/');
}

async function collectSourceFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'artifacts') continue;
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await collectSourceFiles(absolutePath));
    if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) files.push(absolutePath);
  }
  return files;
}

function candidateTargets(sourceFile, specifier) {
  if (!specifier.startsWith('.')) return [];
  const targetAbsolute = path.resolve(path.dirname(sourceFile), specifier);
  const candidates = [];
  for (const ext of sourceExtensions) candidates.push(`${targetAbsolute}${ext}`);
  for (const ext of sourceExtensions) candidates.push(path.join(targetAbsolute, `index${ext}`));
  return candidates;
}

function canonicalCycle(nodes) {
  const unique = nodes.slice(0, -1);
  let best = unique;
  for (let index = 1; index < unique.length; index += 1) {
    const rotated = unique.slice(index).concat(unique.slice(0, index));
    if (rotated.join('\0') < best.join('\0')) best = rotated;
  }
  return best.concat(best[0]);
}

async function buildGraph() {
  const absoluteFiles = [];
  for (const root of scanRoots) absoluteFiles.push(...await collectSourceFiles(path.join(projectRoot, root)));
  const fileByAbsolute = new Map(absoluteFiles.map((file) => [path.normalize(file), toPosix(path.relative(projectRoot, file))]));
  const graph = new Map([...fileByAbsolute.values()].map((file) => [file, []]));

  for (const absoluteSource of absoluteFiles) {
    const source = fileByAbsolute.get(path.normalize(absoluteSource));
    const text = await fs.readFile(absoluteSource, 'utf8');
    importExpressionPattern.lastIndex = 0;
    for (const match of text.matchAll(importExpressionPattern)) {
      for (const candidate of candidateTargets(absoluteSource, match[1])) {
        const target = fileByAbsolute.get(path.normalize(candidate));
        if (!target) continue;
        graph.get(source).push(target);
        break;
      }
    }
  }

  return graph;
}

function findCycles(graph) {
  const temp = new Set();
  const perm = new Set();
  const stack = [];
  const cyclesByKey = new Map();

  function visit(node) {
    if (perm.has(node)) return;
    if (temp.has(node)) {
      const start = stack.indexOf(node);
      if (start >= 0) {
        const cycle = canonicalCycle(stack.slice(start).concat(node));
        cyclesByKey.set(cycle.join('\0'), cycle);
      }
      return;
    }

    temp.add(node);
    stack.push(node);
    for (const next of graph.get(node) ?? []) visit(next);
    stack.pop();
    temp.delete(node);
    perm.add(node);
  }

  for (const node of graph.keys()) visit(node);
  return [...cyclesByKey.values()].sort((a, b) => a.join('\0').localeCompare(b.join('\0')));
}

const graph = await buildGraph();
const cycles = findCycles(graph);
console.log('Import cycle summary:');
console.log(`  ${graph.size} internal source files scanned`);
console.log(`  ${cycles.length} cycles found`);

for (const cycle of cycles.slice(0, 20)) {
  console.log(`  - ${cycle.join(' -> ')}`);
}
if (cycles.length > 20) console.log(`  ...and ${cycles.length - 20} more`);

if (cycles.length > 0) {
  console.error('\nImport cycle check failed. Move shared logic downward or replace barrel imports with direct ownership imports.');
  process.exit(1);
}

console.log('Import cycle check passed.');
