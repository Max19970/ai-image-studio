import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultImageParams, defaultProviderSettings } from '../src/domain/defaults';
import {
  buildOpenAiCompatibleImagePayload,
  createOpenAiCompatibleSubmitProxyRequest,
  explainOpenAiCompatiblePayloadWarnings,
  validateOpenAiCompatibleCustomSize
} from '../src/providers/openai-compatible/requestAdapter';
import {
  collectOpenAiCompatibleImagesFromJson,
  parseOpenAiCompatibleSseBlock
} from '../src/providers/openai-compatible/responseAdapter';

test('OpenAI-compatible payload trims prompt, serializes enabled params, and lets raw JSON override last', () => {
  const payload = buildOpenAiCompatibleImagePayload({
    ...defaultImageParams,
    prompt: '  neon fox  ',
    sizeMode: 'custom',
    width: 1280,
    height: 720,
    n: 3,
    quality: 'high',
    outputFormat: 'jpeg',
    outputCompression: 82,
    includeQuality: true,
    includeOutputFormat: true,
    includeOutputCompression: true,
    includeStream: true,
    stream: true,
    includePartialImages: true,
    partialImages: 2,
    rawJson: '{"seed":123,"n":7}'
  }, defaultProviderSettings, 'generate');

  assert.equal(payload.prompt, 'neon fox');
  assert.equal(payload.model, defaultProviderSettings.modelId);
  assert.equal(payload.size, '1280x720');
  assert.equal(payload.n, 7);
  assert.equal(payload.quality, 'high');
  assert.equal(payload.output_format, 'jpeg');
  assert.equal(payload.output_compression, 82);
  assert.equal(payload.stream, true);
  assert.equal(payload.partial_images, 2);
  assert.equal(payload.seed, 123);
});

test('OpenAI-compatible request adapter keeps PNG compression omitted and validates custom sizes', () => {
  const payload = buildOpenAiCompatibleImagePayload({
    ...defaultImageParams,
    prompt: 'x',
    outputFormat: 'png',
    outputCompression: 50,
    includeOutputFormat: true,
    includeOutputCompression: true
  }, defaultProviderSettings, 'generate');

  assert.equal('output_format' in payload, false);
  assert.equal('output_compression' in payload, false);
  assert.deepEqual(validateOpenAiCompatibleCustomSize(1024, 1024), []);
  assert.ok(validateOpenAiCompatibleCustomSize(1025, 1024).some((message) => message.includes('кратны 16')));
});

test('OpenAI-compatible warnings catch known dangerous payload combinations', () => {
  const warnings = explainOpenAiCompatiblePayloadWarnings({
    model: 'gpt-image-2',
    background: 'transparent',
    response_format: 'url',
    output_format: 'png',
    output_compression: 40,
    stream: false,
    partial_images: 2
  }, defaultProviderSettings, 'generate', null);

  assert.ok(warnings.some((message) => message.includes('transparent')));
  assert.ok(warnings.some((message) => message.includes('output_compression')));
  assert.ok(warnings.some((message) => message.includes('partial_images')));
});

test('OpenAI-compatible submit proxy config distinguishes JSON generate from multipart edit', async () => {
  const generate = createOpenAiCompatibleSubmitProxyRequest({
    provider: defaultProviderSettings,
    payload: { prompt: 'x', stream: true, output_format: 'webp' },
    mode: 'generate'
  });

  assert.equal(generate.path, '/api/generate');
  assert.equal(generate.streamed, true);
  assert.equal(generate.fallbackFormat, 'webp');
  assert.equal((generate.init.headers as Record<string, string>)['Content-Type'], 'application/json');

  const edit = createOpenAiCompatibleSubmitProxyRequest({
    provider: defaultProviderSettings,
    payload: { prompt: 'x' },
    mode: 'edit',
    targetImage: new File(['image'], 'target.png', { type: 'image/png' }),
    referenceImages: [new File(['ref'], 'ref.png', { type: 'image/png' })]
  });

  assert.equal(edit.path, '/api/edit');
  assert.equal(edit.streamed, false);
  assert.ok(edit.init.body instanceof FormData);
});

test('OpenAI-compatible response adapter collects JSON images and parses SSE blocks', () => {
  const images = collectOpenAiCompatibleImagesFromJson({
    output_format: 'webp',
    data: [{ b64_json: 'AAAA' }, { url: 'https://example.test/image.png' }],
    image: { b64_json: 'BBBB' }
  });

  assert.equal(images.length, 3);
  assert.equal(images[0].src, 'data:image/webp;base64,AAAA');
  assert.equal(images[1].format, 'url');
  assert.equal(images[2].src, 'data:image/webp;base64,BBBB');

  const events = parseOpenAiCompatibleSseBlock('event: update\ndata: {"type":"partial","b64_json":"CCCC"}\n\ndata: [DONE]\ndata: nope');
  assert.deepEqual(events, [{ type: 'partial', b64_json: 'CCCC' }]);
});
