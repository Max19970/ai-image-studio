import fs from 'node:fs';
import path from 'node:path';

export interface EnvLoadResult {
  readonly files: readonly string[];
  readonly keys: readonly string[];
}

export function loadImageStudioEnv(cwd = process.cwd(), nodeEnv = process.env.NODE_ENV): EnvLoadResult {
  const candidates = envFileCandidates(cwd, nodeEnv);
  const loadedFiles: string[] = [];
  const loadedKeys = new Set<string>();

  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    const parsed = parseEnvFile(fs.readFileSync(filePath, 'utf8'));
    let used = false;
    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] !== undefined) continue;
      process.env[key] = value;
      loadedKeys.add(key);
      used = true;
    }
    if (used) loadedFiles.push(path.relative(cwd, filePath) || path.basename(filePath));
  }

  return { files: loadedFiles, keys: [...loadedKeys].sort() };
}

export function envFileCandidates(cwd: string, nodeEnv = process.env.NODE_ENV): string[] {
  const names = [
    nodeEnv ? `.env.${nodeEnv}.local` : null,
    '.env.local',
    nodeEnv ? `.env.${nodeEnv}` : null,
    '.env'
  ].filter((name): name is string => Boolean(name));

  return names.map((name) => path.resolve(cwd, name));
}

export function parseEnvFile(source: string): Record<string, string> {
  const values: Record<string, string> = {};
  const lines = source.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const normalizedLine = line.startsWith('export ') ? line.slice('export '.length).trimStart() : line;
    const separatorIndex = normalizedLine.indexOf('=');
    if (separatorIndex <= 0) continue;

    const key = normalizedLine.slice(0, separatorIndex).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;

    const value = parseEnvValue(normalizedLine.slice(separatorIndex + 1));
    values[key] = value;
  }

  return values;
}

function parseEnvValue(rawValue: string): string {
  const value = rawValue.trimStart();
  if (!value) return '';

  const quote = value[0];
  if (quote === '"' || quote === "'") return parseQuotedValue(value, quote);

  const commentIndex = value.indexOf('#');
  const unquoted = commentIndex >= 0 ? value.slice(0, commentIndex) : value;
  return unquoted.trimEnd();
}

function parseQuotedValue(value: string, quote: '"' | "'"): string {
  let result = '';
  let escaped = false;

  for (let index = 1; index < value.length; index += 1) {
    const char = value[index];
    if (escaped) {
      result += quote === '"' ? decodeDoubleQuotedEscape(char) : char;
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === quote) return result;
    result += char;
  }

  return result;
}

function decodeDoubleQuotedEscape(char: string): string {
  switch (char) {
    case 'n':
      return '\n';
    case 'r':
      return '\r';
    case 't':
      return '\t';
    default:
      return char;
  }
}
