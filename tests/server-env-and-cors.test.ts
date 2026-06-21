import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { allowedCorsOrigins } from '../server/http/cors';
import { loadImageStudioEnv, parseEnvFile } from '../server/env/loadEnv';

const touchedEnvKeys = [
  'PORT',
  'HOST',
  'IMAGE_STUDIO_PUBLIC_URL',
  'IMAGE_STUDIO_ALLOWED_HOSTS',
  'IMAGE_STUDIO_ALLOWED_ORIGINS',
  'IMAGE_STUDIO_ENV_TEST_ONLY',
  'QUOTED',
  'INLINE_COMMENT'
];

function withCleanEnv(callback: () => void) {
  const snapshot = new Map(touchedEnvKeys.map((key) => [key, process.env[key]]));
  for (const key of touchedEnvKeys) delete process.env[key];
  try {
    callback();
  } finally {
    for (const key of touchedEnvKeys) {
      const value = snapshot.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test('server env loader reads .env files without overriding shell env', () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'image-studio-env-'));
  try {
    writeFileSync(path.join(tempDir, '.env'), [
      'PORT=8787',
      'IMAGE_STUDIO_ENV_TEST_ONLY=from-env',
      'QUOTED="hello # not comment"',
      'INLINE_COMMENT=value # comment'
    ].join('\n'));
    writeFileSync(path.join(tempDir, '.env.local'), 'IMAGE_STUDIO_PUBLIC_URL=https://local.example\nPORT=9999\n');

    withCleanEnv(() => {
      process.env.PORT = '1234';
      const result = loadImageStudioEnv(tempDir);
      assert.deepEqual(result.files, ['.env.local', '.env']);
      assert.equal(process.env.PORT, '1234');
      assert.equal(process.env.IMAGE_STUDIO_PUBLIC_URL, 'https://local.example');
      assert.equal(process.env.IMAGE_STUDIO_ENV_TEST_ONLY, 'from-env');
      assert.equal(process.env.QUOTED, 'hello # not comment');
      assert.equal(process.env.INLINE_COMMENT, 'value');
    });
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('env parser supports export, quotes, comments, and empty values', () => {
  assert.deepEqual(parseEnvFile(`
# ignored
export HOST=127.0.0.1
EMPTY=
A='single quoted value'
B="line\\nvalue"
C=value # comment
`), {
    HOST: '127.0.0.1',
    EMPTY: '',
    A: 'single quoted value',
    B: 'line\nvalue',
    C: 'value'
  });
});

test('CORS allowlist includes local production origin and public tunnel URL', () => {
  withCleanEnv(() => {
    process.env.HOST = '127.0.0.1';
    process.env.PORT = '8787';
    process.env.IMAGE_STUDIO_PUBLIC_URL = 'https://comfybottg.space/app';
    process.env.IMAGE_STUDIO_ALLOWED_ORIGINS = 'https://app.comfybottg.space,not-a-url';
    process.env.IMAGE_STUDIO_ALLOWED_HOSTS = 'mobile.comfybottg.space';

    const origins = allowedCorsOrigins();
    assert.equal(origins.has('http://127.0.0.1:8787'), true);
    assert.equal(origins.has('http://localhost:8787'), true);
    assert.equal(origins.has('https://comfybottg.space'), true);
    assert.equal(origins.has('https://app.comfybottg.space'), true);
    assert.equal(origins.has('https://mobile.comfybottg.space'), true);
    assert.equal(origins.has('not-a-url'), false);
  });
});
