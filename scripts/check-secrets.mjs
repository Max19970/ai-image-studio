import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const allowedExtensions = new Set([
  '.cjs', '.css', '.env', '.example', '.html', '.js', '.json', '.md', '.mjs', '.ts', '.tsx', '.txt'
]);
const ignoredDirs = new Set(['.git', 'node_modules', 'dist', 'artifacts', 'data', 'coverage', '.tmp', 'tmp']);
const ignoredFiles = new Set(['package-lock.json']);

const secretPatterns = [
  { id: 'openai-key', pattern: /sk-[A-Za-z0-9_-]{20,}/g },
  { id: 'generic-api-key-env', pattern: /(?:^|\n)\s*[A-Z0-9_]*(?:API|TOKEN|SECRET|KEY)[A-Z0-9_]*[^\S\r\n]*=[^\S\r\n]*['\"]?([^\s'\"#][^\r\n#'\"]{7,})/g },
  { id: 'private-key-block', pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g },
  { id: 'bearer-token', pattern: /Bearer\s+[A-Za-z0-9._~+/=-]{24,}/g }
];

const allowedValues = new Set([
  'your key',
  'your-key',
  'your-token',
  'change-me',
  '<your-key>',
  '<token>',
  'YOUR_API_KEY'
]);

function fail(message) {
  console.error(`Secret check failed: ${message}`);
  process.exitCode = 1;
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

function shouldScan(file) {
  const rel = path.relative(root, file).replaceAll(path.sep, '/');
  if (ignoredFiles.has(path.basename(file))) return false;
  if (rel === '.env.example') return true;
  const ext = path.extname(file);
  return allowedExtensions.has(ext);
}

function isPlaceholder(value) {
  const normalized = value.trim().replace(/^['\"]|['\"]$/g, '');
  if (!normalized) return true;
  if (allowedValues.has(normalized)) return true;
  if (/^https?:\/\//.test(normalized)) return true;
  if (/^\.\//.test(normalized)) return true;
  if (/^https?:\/\//.test(normalized)) return true;
  if (/^\/[A-Za-z0-9_./-]+$/.test(normalized)) return true;
  if (/^127\.0\.0\.1|localhost/.test(normalized)) return true;
  if (/^[0-9]+$/.test(normalized)) return true;
  return false;
}

const findings = [];
for (const file of walk(root).filter(shouldScan)) {
  const rel = path.relative(root, file).replaceAll(path.sep, '/');
  const text = fs.readFileSync(file, 'utf8');
  for (const { id, pattern } of secretPatterns) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      if (id === 'generic-api-key-env' && isPlaceholder(match[1] ?? '')) continue;
      findings.push(`${rel}: ${id}`);
    }
  }
}

if (findings.length) {
  for (const finding of findings) console.error(`  ${finding}`);
  fail(`${findings.length} potential secret(s) found. Replace real values with placeholders before publishing.`);
} else {
  console.log('Secret check passed: no obvious API keys, private keys, or bearer tokens found.');
}
