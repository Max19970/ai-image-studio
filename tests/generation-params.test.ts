import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultImageParams } from '../src/domain/defaults';
import {
  captureGenerationRequestParamsSnapshot,
  logicalGenerationParamDefinitions,
  normalizeImageParamsFromDefinitions,
  restoreImageParamsFromRequestSnapshot,
  sanitizeGenerationRequestParamsSnapshot
} from '../src/entities/generation-params/logicalRegistry';
import type { GenerationRequestSnapshot } from '../src/domain/generationTask';

test('generation params registry has stable unique module ids and state keys', () => {
  const ids = logicalGenerationParamDefinitions.map((definition) => definition.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes('generationParam.rawJson'));
  assert.ok(logicalGenerationParamDefinitions.every((definition) => definition.stateKeys.length > 0));
});

test('generation params normalization clamps risky numeric values', () => {
  const normalized = normalizeImageParamsFromDefinitions({
    ...defaultImageParams,
    n: 99,
    partialImages: 8,
    outputCompression: 200,
    retryAttempts: 42,
    retryDelaySeconds: 900,
    sizeMode: 'bad' as never,
    width: Number.NaN,
    height: 'nope' as never
  });

  assert.equal(normalized.n, 10);
  assert.equal(normalized.partialImages, 3);
  assert.equal(normalized.outputCompression, 100);
  assert.equal(normalized.retryAttempts, 10);
  assert.equal(normalized.retryDelaySeconds, 600);
  assert.equal(normalized.sizeMode, defaultImageParams.sizeMode);
  assert.equal(normalized.width, defaultImageParams.width);
  assert.equal(normalized.height, defaultImageParams.height);
});

test('generation params snapshot capture and sanitize use param definitions', () => {
  const snapshot = captureGenerationRequestParamsSnapshot({
    ...defaultImageParams,
    n: 2,
    sizeMode: 'custom',
    width: 1536,
    height: 1024,
    rawJson: '{"seed":1}',
    retryAttempts: 2
  });

  assert.equal(snapshot.n, 2);
  assert.equal(snapshot.sizeMode, 'custom');
  assert.equal(snapshot.width, 1536);
  assert.equal(snapshot.rawJson, '{"seed":1}');
  assert.equal(snapshot.retryAttempts, 2);

  const sanitized = sanitizeGenerationRequestParamsSnapshot({ n: 0, partialImages: 99, retryDelaySeconds: 999 });
  assert.equal(sanitized.n, 1);
  assert.equal(sanitized.partialImages, 3);
  assert.equal(sanitized.retryDelaySeconds, 600);
});

test('restoreImageParamsFromRequestSnapshot restores include flags from sent payload keys', () => {
  const snapshot: GenerationRequestSnapshot = {
    createdAt: 1,
    mode: 'edit',
    prompt: 'restored prompt',
    endpoint: '/api/edit',
    providerLabel: 'Provider',
    model: 'model-x',
    modelLabel: 'Model X',
    payload: {
      model: 'model-x',
      n: 3,
      quality: 'medium',
      background: 'opaque',
      input_fidelity: 'high',
      user: 'max'
    },
    warnings: [],
    attachments: [],
    params: {
      ...captureGenerationRequestParamsSnapshot({
        ...defaultImageParams,
        prompt: 'restored prompt',
        n: 3,
        quality: 'medium',
        background: 'opaque',
        inputFidelity: 'high',
        user: 'max'
      })
    }
  };

  const restored = restoreImageParamsFromRequestSnapshot(defaultImageParams, snapshot);
  assert.equal(restored.prompt, 'restored prompt');
  assert.equal(restored.includeModel, true);
  assert.equal(restored.includeQuality, true);
  assert.equal(restored.includeBackground, true);
  assert.equal(restored.includeInputFidelity, true);
  assert.equal(restored.includeUser, true);
  assert.equal(restored.includeOutputFormat, false);
});
