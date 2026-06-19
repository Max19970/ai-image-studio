import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { comfyUiProviderAdapter } from '../server/providers/comfyui/adapter';
import { collectComfyUiOutputImages, describeComfyUiHistoryFailure } from '../server/providers/comfyui/responseMapper';
import {
  buildComfyUiTextToImageWorkflow,
  resolveComfyUiGenerationConfig
} from '../server/providers/comfyui/workflowTemplates';
import type { ProviderSettings } from '../server/providers/types';

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
    if (req.method === 'GET' && url.pathname === '/models/checkpoints') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(['realistic.safetensors', 'anime.ckpt']));
      return;
    }
    if (req.method === 'GET' && url.pathname === '/models/loras') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(['lineart.safetensors']));
      return;
    }
    if (req.method === 'GET' && url.pathname === '/object_info/KSampler') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        KSampler: {
          input: {
            required: {
              sampler_name: [['euler', 'dpmpp_2m']],
              scheduler: [['normal', 'karras']]
            }
          }
        }
      }));
      return;
    }
    if (req.method === 'GET' && url.pathname === '/system_stats') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ system: { os: 'test' } }));
      return;
    }
    if (req.method === 'POST' && url.pathname === '/prompt') {
      const body = await readBody(req);
      received.push(body);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ prompt_id: 'prompt-1', number: 1 }));
      return;
    }
    if (req.method === 'GET' && url.pathname === '/history/prompt-1') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        'prompt-1': {
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

function provider(baseUrl: string): ProviderSettings {
  return {
    adapterId: 'comfyui',
    generationEndpoint: baseUrl,
    editEndpoint: '',
    responsesEndpoint: '',
    apiKey: '',
    modelId: 'realistic.safetensors',
    authHeaderName: '',
    authScheme: '',
    customHeadersJson: '',
    timeoutMs: 5_000,
    persistApiKey: false
  };
}

test('ComfyUI workflow injects checkpoint, sampler params and LoRA chain without UI dependencies', () => {
  const config = resolveComfyUiGenerationConfig(provider('http://127.0.0.1:8188'), {
    prompt: 'forest shrine',
    negative_prompt: 'blur',
    width: 768,
    height: 1024,
    seed: 123,
    steps: 32,
    cfg: 6.5,
    sampler_name: 'dpmpp_2m',
    scheduler: 'karras',
    loras: [{ lora_name: 'lineart.safetensors', strength_model: 0.8, strength_clip: 0.7 }]
  });
  const workflow = buildComfyUiTextToImageWorkflow(config);

  assert.equal(workflow['4'].inputs.ckpt_name, 'realistic.safetensors');
  assert.equal(workflow['10'].class_type, 'LoraLoader');
  assert.deepEqual(workflow['6'].inputs.clip, ['10', 1]);
  assert.deepEqual(workflow['3'].inputs.model, ['10', 0]);
  assert.equal(workflow['3'].inputs.sampler_name, 'dpmpp_2m');
  assert.equal(workflow['3'].inputs.scheduler, 'karras');
  assert.deepEqual(workflow['5'].inputs, { width: 768, height: 1024, batch_size: 1 });
});

test('ComfyUI resources adapter reads checkpoints, LoRA files, samplers and schedulers', async () => {
  await withFakeComfyUi(async (baseUrl) => {
    const settings = provider(baseUrl);
    const checkpoints = await comfyUiProviderAdapter.fetchResources?.(settings, 'checkpoints');
    const loras = await comfyUiProviderAdapter.fetchResources?.(settings, 'loras');
    const samplers = await comfyUiProviderAdapter.fetchResources?.(settings, 'samplers');
    const schedulers = await comfyUiProviderAdapter.fetchResources?.(settings, 'schedulers');

    assert.deepEqual(checkpoints?.items.map((item) => item.id), ['realistic.safetensors', 'anime.ckpt']);
    assert.deepEqual(loras?.items.map((item) => item.id), ['lineart.safetensors']);
    assert.deepEqual(samplers?.items.map((item) => item.id), ['euler', 'dpmpp_2m']);
    assert.deepEqual(schedulers?.items.map((item) => item.id), ['normal', 'karras']);
  });
});

test('ComfyUI generate adapter posts workflow, polls history and returns OpenAI-compatible image JSON', async () => {
  await withFakeComfyUi(async (baseUrl, received) => {
    const settings = provider(baseUrl);
    const { upstream } = await comfyUiProviderAdapter.fetchGenerate(settings, {
      prompt: 'small fox',
      width: 512,
      height: 512,
      seed: 42,
      steps: 12,
      sampler_name: 'euler',
      scheduler: 'normal'
    });

    const raw = await upstream.json() as any;
    assert.equal(upstream.status, 200);
    assert.equal(raw.provider, 'comfyui');
    assert.equal(raw.comfyui.prompt_id, 'prompt-1');
    assert.equal(raw.comfyui.seed, 42);
    assert.equal(raw.data.length, 1);
    assert.equal(raw.data[0].b64_json, tinyPng.toString('base64'));
    assert.equal((received[0] as any).prompt['4'].inputs.ckpt_name, 'realistic.safetensors');
  });
});

test('ComfyUI response mapper collects image references from direct and wrapped history shapes', () => {
  assert.deepEqual(collectComfyUiOutputImages({ outputs: { '9': { images: [{ filename: 'a.png' }] } } }), [
    { filename: 'a.png', subfolder: '', type: 'output' }
  ]);
  assert.deepEqual(collectComfyUiOutputImages({ id: { outputs: { '9': { images: [{ filename: 'b.webp', subfolder: 'x', type: 'temp' }] } } } }), [
    { filename: 'b.webp', subfolder: 'x', type: 'temp' }
  ]);
});


test('ComfyUI response mapper explains failed workflow history status', () => {
  const message = describeComfyUiHistoryFailure({
    status: {
      status_str: 'error',
      completed: false,
      messages: [['execution_error', { exception_message: 'LoRA file not found', node_id: '10' }]]
    }
  });

  assert.ok(message?.includes('error'));
  assert.ok(message?.includes('LoRA file not found'));
});
