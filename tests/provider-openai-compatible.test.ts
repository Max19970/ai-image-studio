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
  compactOpenAiCompatibleResponseRaw,
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

test('OpenAI-compatible payload always includes the selected provider model', () => {
  const payload = buildOpenAiCompatibleImagePayload({
    ...defaultImageParams,
    prompt: 'model fox',
    includeModel: false,
    rawJson: '{"model":"raw-model"}'
  }, defaultProviderSettings, 'generate');

  assert.equal(payload.model, 'raw-model');

  const withoutRawOverride = buildOpenAiCompatibleImagePayload({
    ...defaultImageParams,
    prompt: 'model fox',
    includeModel: false
  }, defaultProviderSettings, 'generate');

  assert.equal(withoutRawOverride.model, defaultProviderSettings.modelId);
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

  assert.equal(generate.path, '/api/provider/submit');
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

  assert.equal(edit.path, '/api/provider/submit');
  assert.equal(edit.streamed, false);
  assert.ok(edit.init.body instanceof FormData);
});

test('OpenAI-compatible response adapter collects streamed partial and completed Responses API images', () => {
  const partial = collectOpenAiCompatibleImagesFromJson({
    type: 'response.image_generation_call.partial_image',
    partial_image_index: 1,
    partial_image_b64: 'PARTIAL'
  });
  assert.equal(partial.length, 1);
  assert.equal(partial[0].kind, 'partial');
  assert.equal(partial[0].index, 1);
  assert.equal(partial[0].src, 'data:image/png;base64,PARTIAL');

  const completed = collectOpenAiCompatibleImagesFromJson({
    type: 'response.completed',
    response: {
      output: [{ type: 'image_generation_call', result: 'FINAL' }]
    }
  });
  assert.equal(completed.length, 1);
  assert.equal(completed[0].kind, 'final');
  assert.equal(completed[0].src, 'data:image/png;base64,FINAL');
});

test('OpenAI-compatible response adapter collects non-stream Responses API output images', () => {
  const response = collectOpenAiCompatibleImagesFromJson({
    id: 'resp_123',
    object: 'response',
    status: 'completed',
    output_format: 'webp',
    output: [
      { type: 'message' },
      { type: 'image_generation_call', status: 'completed', result: 'NON_STREAM_FINAL' }
    ]
  });

  assert.equal(response.length, 1);
  assert.equal(response[0].kind, 'final');
  assert.equal(response[0].src, 'data:image/webp;base64,NON_STREAM_FINAL');
});

test('OpenAI-compatible response adapter compacts raw edit base64 payloads', () => {
  const raw = {
    created: 1,
    data: [{ b64_json: 'A'.repeat(64), revised_prompt: 'done' }]
  };

  const compacted = compactOpenAiCompatibleResponseRaw(raw) as any;
  assert.equal(compacted.created, 1);
  assert.equal(compacted.data[0].revised_prompt, 'done');
  assert.equal(compacted.data[0].b64_json, '[omitted inline image payload: 64 chars]');
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
