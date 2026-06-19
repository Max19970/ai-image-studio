import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { parseProviderSettings } from '../server/providers/registry';
import { comfyUiProviderAdapter } from '../server/providers/comfyui/adapter';
import { defaultImageParams, defaultStudioSettings } from '../src/domain/defaults';
import { captureRequestSnapshot, attachSnapshot, providerContextForModel } from '../src/domain/generationSnapshots';
import type { StudioSettings } from '../src/domain/studioSettings';
import { writeProviderParamState } from '../src/entities/generation-params/providerState';
import { buildImagePayload } from '../src/entities/provider/request';
import { comfyUiResponseAdapter } from '../src/providers/comfyui/responseAdapter';

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lqT3WQAAAABJRU5ErkJggg==',
  'base64'
);

async function readBody(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : null;
}

async function withFakeComfyUi<T>(handler: (baseUrl: string, received: unknown[]) => Promise<T>): Promise<T> {
  const received: unknown[] = [];
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    if (req.method === 'POST' && url.pathname === '/prompt') {
      const body = await readBody(req);
      received.push(body);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ prompt_id: 'e2e-prompt-1', number: 1 }));
      return;
    }
    if (req.method === 'GET' && url.pathname === '/history/e2e-prompt-1') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        'e2e-prompt-1': {
          status: { status_str: 'success', completed: true, messages: [] },
          outputs: {
            '9': {
              images: [{ filename: 'image-studio_00001_.png', subfolder: '', type: 'output' }]
            }
          }
        }
      }));
      return;
    }
    if (req.method === 'GET' && url.pathname === '/view') {
      res.setHeader('Content-Type', 'image/png');
      res.end(tinyPng);
      return;
    }
    res.statusCode = 404;
    res.end('not found');
  });

  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address() as AddressInfo;
  try {
    return await handler(`http://127.0.0.1:${address.port}`, received);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

function comfySettings(baseUrl: string): StudioSettings {
  return {
    ...defaultStudioSettings,
    selectedModelId: 'comfy-e2e-model',
    providers: [
      ...defaultStudioSettings.providers,
      {
        id: 'comfy-e2e-provider',
        name: 'Local ComfyUI E2E',
        adapterId: 'comfyui',
        generationEndpoint: baseUrl,
        editEndpoint: '',
        responsesEndpoint: '',
        apiKey: '',
        authHeaderName: '',
        authScheme: '',
        customHeadersJson: '',
        timeoutMs: 1_200_000,
        persistApiKey: false
      }
    ],
    models: [
      ...defaultStudioSettings.models,
      {
        id: 'comfy-e2e-model',
        name: 'Realistic local checkpoint',
        providerId: 'comfy-e2e-provider',
        modelId: 'realistic.safetensors',
        notes: ''
      }
    ]
  };
}

test('default settings include a non-active ComfyUI preset', () => {
  assert.equal(defaultStudioSettings.selectedModelId, 'gpt-image-2-default');
  assert.ok(defaultStudioSettings.providers.some((provider) => provider.adapterId === 'comfyui'));
  assert.ok(defaultStudioSettings.models.some((model) => model.providerId === 'comfyui-local-default'));
});

test('server provider parser uses ComfyUI-specific timeout limits', () => {
  const provider = parseProviderSettings({
    adapterId: 'comfyui',
    generationEndpoint: 'http://127.0.0.1:8188',
    timeoutMs: 1_200_000
  });
  assert.equal(provider.adapterId, 'comfyui');
  assert.equal(provider.timeoutMs, 1_200_000);
});

test('ComfyUI MVP request flows from provider/model selection to gallery-ready image snapshot', async () => {
  await withFakeComfyUi(async (baseUrl, received) => {
    const settings = comfySettings(baseUrl);
    const { model, generationProvider, provider } = providerContextForModel(settings, settings.selectedModelId);
    const params = writeProviderParamState({ ...defaultImageParams, prompt: 'small local fox' }, provider, {
      width: 512,
      height: 768,
      batchSize: 1,
      steps: 12,
      cfg: 6.5,
      samplerName: 'euler',
      scheduler: 'normal',
      seedMode: 'fixed',
      seed: 42,
      denoise: 1,
      negativePrompt: 'blur',
      filenamePrefix: 'image-studio',
      loras: [{ name: 'lineart.safetensors', strengthModel: 0.8, strengthClip: 0.7, enabled: true }]
    });

    const payload = buildImagePayload(params, provider, 'generate');
    const { upstream } = await comfyUiProviderAdapter.fetchGenerate(provider, payload);
    const raw = await upstream.json();
    const images = comfyUiResponseAdapter.collectImagesFromJson(raw, 'png');
    const snapshot = captureRequestSnapshot({
      mode: 'generate',
      params,
      provider,
      activeProvider: generationProvider,
      activeModel: model,
      payload,
      warnings: [],
      targetImage: null,
      referenceImages: [],
      mask: null,
      fallbackProviderLabel: 'Local provider'
    });
    const attached = attachSnapshot(images, snapshot, 'comfy-task-1');

    assert.equal(images.length, 1);
    assert.equal(attached[0].taskId, 'comfy-task-1');
    assert.equal(attached[0].request?.providerAdapterId, 'comfyui');
    assert.equal(attached[0].request?.surfaceId, 'comfyui.text-to-image');
    assert.equal(attached[0].request?.model, 'realistic.safetensors');
    assert.equal((raw as any).comfyui.prompt_id, 'e2e-prompt-1');
    assert.equal(((received[0] as any).prompt['4'].inputs.ckpt_name), 'realistic.safetensors');
    assert.equal(((received[0] as any).prompt['10'].inputs.lora_name), 'lineart.safetensors');
  });
});
