#!/usr/bin/env node
import { existsSync, promises as fs } from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const baselinePath = path.join(projectRoot, 'scripts', 'architecture-boundary-baseline.json');
const writeBaseline = process.argv.includes('--write-baseline');
const strict = process.argv.includes('--strict');
const scanRoots = ['src'];
const sourceExtensions = new Set(['.ts', '.tsx']);
const importExpressionPattern = /(?:import|export)\s+(?:type\s+)?(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g;

const rules = [
  {
    id: 'no-import-from-legacy-components',
    title: 'New code must not import from src/components',
    reason:
      'src/components was removed during the architecture migration. Put reusable UI in src/shared/ui and feature-owned UI inside src/features/<feature>.',
    matches: ({ source, target }) =>
      startsWithPath(target, 'src/components') && !startsWithPath(source, 'src/components')
  },
  {
    id: 'no-legacy-components-to-features',
    title: 'Legacy components must not grow new dependencies on src/features',
    reason:
      'src/components must not be recreated as an active layer. Feature-owned UI belongs inside src/features/<feature>.',
    matches: ({ source, target }) =>
      startsWithPath(source, 'src/components') && startsWithPath(target, 'src/features')
  },
  {
    id: 'no-shared-upward-imports',
    title: 'Shared modules must stay independent from higher layers',
    reason:
      'src/shared should only contain reusable primitives and must not depend on app/features/entities/processes/providers/interface/infrastructure/components.',
    matches: ({ source, target }) =>
      startsWithPath(source, 'src/shared') &&
      [
        'src/app',
        'src/components',
        'src/domain',
        'src/entities',
        'src/features',
        'src/infrastructure',
        'src/interface',
        'src/processes',
        'src/providers'
      ].some((forbiddenTarget) => startsWithPath(target, forbiddenTarget))
  },
  {
    id: 'no-entities-to-features-or-app',
    title: 'Entities must not depend on app/features/interface/components',
    reason:
      'Entity modules should describe business/data concepts. UI composition and feature behavior must depend on entities, not the other way around.',
    matches: ({ source, target }) =>
      startsWithPath(source, 'src/entities') &&
      ['src/app', 'src/features', 'src/interface', 'src/components'].some((forbiddenTarget) =>
        startsWithPath(target, forbiddenTarget)
      )
  },
  {
    id: 'no-entities-to-processes',
    title: 'Entities must not depend on workflow/process modules',
    reason:
      'Entities should contain stable business/data concepts. Shared lifecycle/status helpers belong in src/domain when both entities and processes need them.',
    matches: ({ source, target }) => startsWithPath(source, 'src/entities') && startsWithPath(target, 'src/processes')
  },
  {
    id: 'no-processes-to-app-or-features',
    title: 'Processes must not depend on app/features/components/interface UI',
    reason:
      'Processes own workflows and should stay reusable from the app shell, commands, or future automation surfaces.',
    matches: ({ source, target }) =>
      startsWithPath(source, 'src/processes') &&
      ['src/app', 'src/features', 'src/components', 'src/interface'].some((forbiddenTarget) =>
        startsWithPath(target, forbiddenTarget)
      )
  }
];

function toPosix(filePath) {
  return filePath.split(path.sep).join('/');
}

function startsWithPath(candidate, prefix) {
  return candidate === prefix || candidate.startsWith(`${prefix}/`);
}

async function collectSourceFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'artifacts') {
      continue;
    }

    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(absolutePath)));
      continue;
    }

    if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) {
      files.push(absolutePath);
    }
  }

  return files;
}

function resolveImport(sourceFile, specifier) {
  if (!specifier.startsWith('.')) {
    return null;
  }

  const sourceDir = path.dirname(sourceFile);
  const targetAbsolute = path.resolve(sourceDir, specifier);
  const relative = toPosix(path.relative(projectRoot, targetAbsolute));

  return relative.startsWith('..') ? null : relative;
}

function lineNumberForIndex(text, index) {
  let line = 1;
  for (let cursor = 0; cursor < index; cursor += 1) {
    if (text.charCodeAt(cursor) === 10) {
      line += 1;
    }
  }
  return line;
}

function recordKey(record) {
  return `${record.ruleId}\u0000${record.source}\u0000${record.specifier}\u0000${record.target}`;
}

async function collectViolations() {
  const sourceFiles = [];
  for (const root of scanRoots) {
    sourceFiles.push(...(await collectSourceFiles(path.join(projectRoot, root))));
  }

  const violations = [];

  for (const absoluteSource of sourceFiles) {
    const source = toPosix(path.relative(projectRoot, absoluteSource));
    const text = await fs.readFile(absoluteSource, 'utf8');
    importExpressionPattern.lastIndex = 0;

    for (const match of text.matchAll(importExpressionPattern)) {
      const specifier = match[1];
      const target = resolveImport(absoluteSource, specifier);
      if (!target) {
        continue;
      }

      for (const rule of rules) {
        if (!rule.matches({ source, target, specifier })) {
          continue;
        }

        violations.push({
          ruleId: rule.id,
          source,
          specifier,
          target,
          line: lineNumberForIndex(text, match.index ?? 0)
        });
      }
    }
  }

  return violations.sort((a, b) => recordKey(a).localeCompare(recordKey(b)) || a.line - b.line);
}

async function readBaseline() {
  if (!existsSync(baselinePath)) {
    return { version: 1, violations: [] };
  }

  const raw = await fs.readFile(baselinePath, 'utf8');
  return JSON.parse(raw);
}

function groupByRule(records) {
  const groups = new Map();
  for (const record of records) {
    const list = groups.get(record.ruleId) ?? [];
    list.push(record);
    groups.set(record.ruleId, list);
  }
  return groups;
}

function printRecords(title, records, limit = 20) {
  if (records.length === 0) {
    return;
  }

  console.log(`\n${title} (${records.length}):`);
  for (const record of records.slice(0, limit)) {
    console.log(`  - ${record.ruleId}: ${record.source}:${record.line} -> ${record.specifier} (${record.target})`);
  }
  if (records.length > limit) {
    console.log(`  ...and ${records.length - limit} more`);
  }
}

function printRuleSummary(violations) {
  const groups = groupByRule(violations);
  console.log('\nArchitecture boundary summary:');

  for (const rule of rules) {
    const count = groups.get(rule.id)?.length ?? 0;
    console.log(`  ${count.toString().padStart(3, ' ')}  ${rule.id}`);
  }
}

async function main() {
  const currentViolations = await collectViolations();

  if (writeBaseline) {
    const baseline = {
      version: 1,
      generatedAt: new Date().toISOString(),
      description:
        'Temporary architecture debt baseline. The checker fails only when new records appear outside this list. Delete entries as migration stages resolve them.',
      rules: rules.map(({ id, title, reason }) => ({ id, title, reason })),
      violations: currentViolations.map(({ ruleId, source, specifier, target }) => ({
        ruleId,
        source,
        specifier,
        target
      }))
    };
    await fs.writeFile(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8');
    console.log(`Architecture baseline written to ${path.relative(projectRoot, baselinePath)}.`);
    printRuleSummary(currentViolations);
    return;
  }

  const baseline = await readBaseline();
  const baselineKeys = new Set((baseline.violations ?? []).map(recordKey));
  const currentKeys = new Set(currentViolations.map(recordKey));
  const newViolations = currentViolations.filter((record) => !baselineKeys.has(recordKey(record)));
  const resolvedViolations = (baseline.violations ?? []).filter((record) => !currentKeys.has(recordKey(record)));

  printRuleSummary(currentViolations);
  printRecords('New architecture boundary violations', newViolations);
  printRecords('Resolved baseline violations', resolvedViolations, 10);

  if (newViolations.length > 0) {
    console.error(
      '\nArchitecture boundary check failed. Move the dependency to the proper layer or refresh the baseline only after an intentional architecture review.'
    );
    process.exit(1);
  }

  if (strict && currentViolations.length > 0) {
    console.error('\nArchitecture boundary strict check failed because baseline debt is still present.');
    process.exit(1);
  }

  if (currentViolations.length === 0) {
    console.log('\nArchitecture boundary check passed: no violations.');
  } else {
    console.log('\nArchitecture boundary check passed: no new violations beyond the current baseline.');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
