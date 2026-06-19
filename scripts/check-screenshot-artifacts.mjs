import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);

function flag(name, fallback = '') {
  const prefix = `--${name}=`;
  const match = argv.find((value) => value.startsWith(prefix));
  if (match) return match.slice(prefix.length);
  const index = argv.indexOf(`--${name}`);
  return index >= 0 ? argv[index + 1] : fallback;
}

function listFlag(name, fallback) {
  return flag(name, fallback)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function readPngSize(filePath) {
  const buffer = fs.readFileSync(filePath);
  const pngSignature = '89504e470d0a1a0a';
  if (buffer.length < 24 || buffer.subarray(0, 8).toString('hex') !== pngSignature) {
    throw new Error('not a PNG file');
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    bytes: buffer.length
  };
}

const outDir = path.resolve(root, flag('dir', 'artifacts/verify-visual'));
const viewports = listFlag('viewports', 'desktop,mobile');
const scenarios = listFlag('scenarios', 'gallery,composer-compact,composer-attachments,composer-controls,gallery-quick-actions,sidebar-collapsed,settings-api,settings-models,detail,attachment-preview-modal,batch-composer,info,parameters');
const minBytes = Number(flag('min-bytes', '2048'));
const failures = [];
const rows = [];

for (const viewport of viewports) {
  for (const scenario of scenarios) {
    const filePath = path.join(outDir, `${viewport}-${scenario}.png`);
    try {
      if (!fs.existsSync(filePath)) throw new Error('missing file');
      const size = readPngSize(filePath);
      if (size.bytes < minBytes) throw new Error(`too small (${size.bytes} bytes)`);
      if (size.width < 200 || size.height < 200) throw new Error(`unexpected dimensions ${size.width}x${size.height}`);
      rows.push({ viewport, scenario, ...size });
    } catch (error) {
      failures.push(`${viewport}-${scenario}.png: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

if (failures.length) {
  console.error('Screenshot artifact check failed:');
  failures.forEach((failure) => console.error(`  - ${failure}`));
  process.exit(1);
}

console.log('Screenshot artifact summary:');
console.log(`  ${rows.length} screenshots checked in ${path.relative(root, outDir)}`);
for (const row of rows) {
  console.log(`  ${row.viewport}-${row.scenario}.png · ${row.width}x${row.height} · ${row.bytes} bytes`);
}
console.log('Screenshot artifact check passed.');
