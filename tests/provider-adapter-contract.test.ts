import test from 'node:test';
import assert from 'node:assert/strict';
import { openAiCompatibleProviderDefinition } from '../src/providers/openai-compatible/definition';
import { comfyUiProviderDefinition } from '../src/providers/comfyui/definition';
import { openAiCompatibleSettingsFields } from '../src/providers/openai-compatible/settingsSchema';
import { openAiCompatibleProviderAdapter } from '../server/providers/openai-compatible/adapter';
import { comfyUiProviderAdapter } from '../server/providers/comfyui/adapter';
import { buildOpenAiCompatibleHeaders } from '../server/providers/openai-compatible/auth';
import { providerFingerprint, resolveOpenAiCompatibleEndpoint } from '../server/providers/openai-compatible/endpoints';
import { describeFetchFailure, extractUpstreamMessage, isRetryableNetworkError } from '../server/providers/openai-compatible/errorNormalizer';
import { classifyProbeResult } from '../server/providers/openai-compatible/probeClassifier';
import { fetchOpenAiCompatibleEdit, fetchOpenAiCompatibleGenerate } from '../server/providers/openai-compatible/requestHandlers';
import { quickCheckOpenAiCompatibleProvider } from '../server/providers/openai-compatible/probeSuite';
import type { ProviderSettings, UploadedFile } from '../server/providers/types';

const provider: ProviderSettings = {
  adapterId: 'openai-compatible',
  generationEndpoint: 'https://provider.test/v1/images/generations',
  editEndpoint: 'https://provider.test/v1/images/edits',
  responsesEndpoint: 'https://provider.test/v1/responses',
  apiKey: 'test-key',
  modelId: 'image-model',
  authHeaderName: 'Authorization',
  authScheme: 'Bearer',
  customHeadersJson: '{"X-Trace":"contract-test"}',
  timeoutMs: 5000,
  persistApiKey: false
};

function withMockFetch<T>(handler: typeof fetch, run: () => Promise<T>): Promise<T> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = handler;
  return run().finally(() => {
    globalThis.fetch = originalFetch;
  });
}

test('provider adapter definitions expose stable client/server contracts', () => {
  assert.equal(openAiCompatibleProviderDefinition.id, openAiCompatibleProviderAdapter.id);
  assert.equal(openAiCompatibleProviderDefinition.supportsMultipartEdit, true);
  assert.deepEqual(openAiCompatibleProviderDefinition.capabilities, openAiCompatibleProviderAdapter.capabilities);
  assert.equal(openAiCompatibleProviderDefinition.capabilities.supportsGenerate, true);
  assert.equal(openAiCompatibleProviderDefinition.capabilities.supportsEdit, true);
  assert.equal(openAiCompatibleProviderDefinition.capabilities.hasLiveResources, false);
  assert.deepEqual(openAiCompatibleProviderDefinition.resources.kinds, []);
  assert.equal(openAiCompatibleProviderDefinition.generationSurface.kind, 'logical-params');
  assert.equal(openAiCompatibleProviderDefinition.detailDescriptor.kind, 'request-snapshot');
  assert.equal(openAiCompatibleProviderDefinition.controlSurface.kind, 'api-image');
  assert.equal(openAiCompatibleProviderDefinition.controlSurface.showModeSwitcher, true);
  assert.equal(openAiCompatibleProviderDefinition.controlSurface.showImageAttachments, true);
  assert.equal(openAiCompatibleProviderDefinition.controlSurface.showMask, true);
  assert.equal(openAiCompatibleProviderDefinition.controlSurface.showLoraRegistry, false);
  assert.ok(openAiCompatibleProviderDefinition.settingsFields.length >= 6);
  assert.equal(openAiCompatibleProviderDefinition.generationParams.id, 'openai-compatible.default');
  assert.equal(openAiCompatibleProviderDefinition.generationParams.include, 'all');

  const uniqueKeys = new Set(openAiCompatibleSettingsFields.map((field) => field.key));
  assert.equal(uniqueKeys.size, openAiCompatibleSettingsFields.length);
  assert.ok(openAiCompatibleSettingsFields.some((field) => field.key === 'generationEndpoint' && field.operation === 'generate'));
  assert.ok(openAiCompatibleSettingsFields.some((field) => field.key === 'editEndpoint' && field.operation === 'edit'));
  assert.ok(openAiCompatibleSettingsFields.some((field) => field.key === 'apiKey' && field.sensitive));

  assert.deepEqual(openAiCompatibleProviderAdapter.resources.kinds, []);
  assert.equal(openAiCompatibleProviderAdapter.capabilities.supportsStreaming, true);
  assert.equal(openAiCompatibleProviderAdapter.capabilities.usesLocalWorkflow, false);
  assert.equal(openAiCompatibleProviderAdapter.fetchResources, undefined);

  const parsed = openAiCompatibleProviderAdapter.settingsSchema.parse(provider);
  assert.equal(parsed.adapterId, 'openai-compatible');
  assert.equal(parsed.modelId, 'image-model');
});



test('ComfyUI client and server adapter contracts stay aligned', () => {
  assert.equal(comfyUiProviderDefinition.id, comfyUiProviderAdapter.id);
  assert.equal(comfyUiProviderDefinition.supportsMultipartEdit, false);
  assert.deepEqual(comfyUiProviderDefinition.capabilities, comfyUiProviderAdapter.capabilities);
  assert.equal(comfyUiProviderDefinition.capabilities.supportsGenerate, true);
  assert.equal(comfyUiProviderDefinition.capabilities.supportsEdit, false);
  assert.equal(comfyUiProviderDefinition.capabilities.usesLocalWorkflow, true);
  assert.equal(comfyUiProviderDefinition.capabilities.hasLiveResources, true);
  assert.deepEqual(comfyUiProviderDefinition.resources.kinds, comfyUiProviderAdapter.resources.kinds);
  assert.equal(comfyUiProviderDefinition.generationSurface.kind, 'provider-owned');
  assert.equal(comfyUiProviderDefinition.generationSurface.id, 'comfyui.text-to-image');
  assert.equal(comfyUiProviderDefinition.detailDescriptor.kind, 'provider-owned');
  assert.equal(comfyUiProviderDefinition.controlSurface.kind, 'local-workflow');
  assert.equal(comfyUiProviderDefinition.controlSurface.showModeSwitcher, false);
  assert.equal(comfyUiProviderDefinition.controlSurface.showImageAttachments, false);
  assert.equal(comfyUiProviderDefinition.controlSurface.showMask, false);
  assert.equal(comfyUiProviderDefinition.controlSurface.showLoraRegistry, true);
  assert.ok(comfyUiProviderDefinition.settingsFields.some((field) => field.key === 'generationEndpoint'));
});

test('OpenAI-compatible server adapter resolves endpoints and auth/custom headers predictably', () => {
  assert.equal(resolveOpenAiCompatibleEndpoint(provider, 'generate'), 'https://provider.test/v1/images/generations');
  assert.equal(resolveOpenAiCompatibleEndpoint(provider, 'edit'), 'https://provider.test/v1/images/edits');
  assert.throws(() => resolveOpenAiCompatibleEndpoint({ ...provider, generationEndpoint: 'file:///tmp/x' }, 'generate'), /HTTP\/HTTPS/);

  const headers = buildOpenAiCompatibleHeaders(provider);
  assert.equal(headers.get('Content-Type'), 'application/json');
  assert.equal(headers.get('Authorization'), 'Bearer test-key');
  assert.equal(headers.get('X-Trace'), 'contract-test');

  const multipartHeaders = buildOpenAiCompatibleHeaders(provider, true);
  assert.equal(multipartHeaders.get('Content-Type'), null);
  assert.equal(multipartHeaders.get('Authorization'), 'Bearer test-key');

  assert.notEqual(providerFingerprint(provider), providerFingerprint({ ...provider, modelId: 'different-model' }));
});

test('OpenAI-compatible server generate/edit handlers use adapter endpoints and request shapes', async () => {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  await withMockFetch(async (input, init) => {
    calls.push({ input, init });
    return new Response('{"data":[]}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  }, async () => {
    const generate = await fetchOpenAiCompatibleGenerate(provider, { prompt: 'fox', model: 'image-model' });
    assert.equal(generate.endpoint, provider.generationEndpoint);
    assert.equal(calls[0].input, provider.generationEndpoint);
    assert.equal((calls[0].init?.headers as Headers).get('Content-Type'), 'application/json');
    assert.equal(JSON.parse(String(calls[0].init?.body)).prompt, 'fox');

    const image: UploadedFile = {
      fieldname: 'image_target',
      originalname: 'target.png',
      encoding: '7bit',
      mimetype: 'image/png',
      size: 4,
      buffer: Buffer.from([1, 2, 3, 4])
    } as UploadedFile;

    const edit = await fetchOpenAiCompatibleEdit(provider, { prompt: 'edit fox', model: 'image-model' }, [image]);
    assert.equal(edit.endpoint, provider.editEndpoint);
    assert.equal(calls[1].input, provider.editEndpoint);
    assert.ok(calls[1].init?.body instanceof FormData);
    assert.equal((calls[1].init?.headers as Headers).get('Content-Type'), null);
  });
});

test('provider error normalization covers upstream JSON, fetch failures, and retryability', () => {
  assert.equal(extractUpstreamMessage('{"error":{"message":"bad parameter"}}'), 'bad parameter');
  assert.equal(extractUpstreamMessage('{"message":"plain bad"}'), 'plain bad');
  assert.equal(extractUpstreamMessage('not-json'), 'not-json');

  const networkError = Object.assign(new Error('socket closed'), { cause: { code: 'UND_ERR_SOCKET', syscall: 'read' } });
  assert.equal(isRetryableNetworkError(networkError), true);
  const normalized = describeFetchFailure(networkError, provider.generationEndpoint);
  assert.equal(normalized.statusCode, 502);
  assert.match(normalized.message, /UND_ERR_SOCKET/);

  const timeout = describeFetchFailure({ name: 'AbortError' }, provider.generationEndpoint);
  assert.equal(timeout.statusCode, 502);
  assert.match(timeout.message, /timed out/);
});

test('probe classification distinguishes accepted/rejected/error and quick check normalizes failures', async () => {
  assert.equal(classifyProbeResult(200, 'OK'), 'accepted');
  assert.equal(classifyProbeResult(400, 'Unknown parameter: style'), 'rejected');
  assert.equal(classifyProbeResult(422, 'invalid request'), 'rejected');
  assert.equal(classifyProbeResult(500, 'temporarily broken'), 'error');
  assert.equal(classifyProbeResult(null, 'network'), 'error');

  await withMockFetch(async () => new Response('{"error":{"message":"unauthorized"}}', { status: 401 }), async () => {
    const result = await quickCheckOpenAiCompatibleProvider(provider);
    assert.equal(result.ok, false);
    assert.equal(result.status, 401);
    assert.equal(result.message, 'unauthorized');
  });
});
