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

async function readBuffer(req: http.IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function readBody(req: http.IncomingMessage): Promise<unknown> {
  const text = (await readBuffer(req)).toString('utf8');
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
    if (req.method === 'GET' && url.pathname === '/models/upscale_models') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(['4x-UltraSharp.pth']));
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
    if (req.method === 'POST' && url.pathname === '/upload/image') {
      const body = await readBuffer(req);
      received.push({ upload: { contentType: req.headers['content-type'], bytes: body.length } });
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ name: 'input.png', subfolder: '', type: 'input' }));
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

function targetFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    fieldname: 'image_target',
    originalname: 'input.png',
    encoding: '7bit',
    mimetype: 'image/png',
    size: tinyPng.length,
    destination: '',
    filename: 'input.png',
    path: '',
    buffer: tinyPng,
    stream: null as any,
    ...overrides
  };
}

function workflowNodeByClass(workflow: Record<string, any>, classType: string): any | null {
  return Object.values(workflow).find((node) => node?.class_type === classType) ?? null;
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

test('ComfyUI workflow injects optional tiled nodes without changing the base path when disabled', () => {
  const baseConfig = resolveComfyUiGenerationConfig(provider('http://127.0.0.1:8188'), {
    prompt: 'forest shrine',
    width: 768,
    height: 1024,
    seed: 123
  });
  const baseWorkflow = buildComfyUiTextToImageWorkflow(baseConfig);
  assert.equal(workflowNodeByClass(baseWorkflow, 'KSampler')?.class_type, 'KSampler');
  assert.equal(workflowNodeByClass(baseWorkflow, 'BNK_TiledKSampler'), null);
  assert.equal(workflowNodeByClass(baseWorkflow, 'VAEDecodeTiled'), null);

  const tiledConfig = resolveComfyUiGenerationConfig(provider('http://127.0.0.1:8188'), {
    prompt: 'forest shrine',
    seed: 123,
    tiled_generation: { enabled: true, tile_width: 640, tile_height: 768, tiling_strategy: 'padded' },
    tiled_vae: { decode: true, tile_size: 768, overlap: 96 }
  });
  const tiledWorkflow = buildComfyUiTextToImageWorkflow(tiledConfig);
  const tiledSampler = workflowNodeByClass(tiledWorkflow, 'BNK_TiledKSampler');
  assert.equal(tiledSampler?.inputs.tile_width, 640);
  assert.equal(tiledSampler?.inputs.tile_height, 768);
  assert.equal(tiledSampler?.inputs.tiling_strategy, 'padded');
  assert.equal(workflowNodeByClass(tiledWorkflow, 'KSampler'), null);
  assert.equal(workflowNodeByClass(tiledWorkflow, 'VAEDecodeTiled')?.inputs.tile_size, 768);
});

test('ComfyUI workflow can use ComfyUI_TiledDiffusion as a model patch backend', () => {
  const config = resolveComfyUiGenerationConfig(provider('http://127.0.0.1:8188'), {
    prompt: 'forest shrine',
    seed: 123,
    tiled_generation: {
      enabled: true,
      backend: 'tiled_diffusion',
      tile_width: 768,
      tile_height: 640,
      method: 'SpotDiffusion',
      tile_overlap: 96,
      tile_batch_size: 3,
      shift_method: 'fibonacci',
      shift_seed: 42
    },
    perp_neg_guider: { enabled: true, neg_scale: 1.4 }
  });
  const workflow = buildComfyUiTextToImageWorkflow(config);
  const tiledDiffusionNode = workflowNodeByClass(workflow, 'TiledDiffusion');
  const spotParamsNode = workflowNodeByClass(workflow, 'SpotDiffusionParams_TiledDiffusion');
  const guiderNode = workflowNodeByClass(workflow, 'PerpNegGuider');

  assert.equal(tiledDiffusionNode?.inputs.method, 'SpotDiffusion');
  assert.equal(tiledDiffusionNode?.inputs.tile_width, 768);
  assert.equal(tiledDiffusionNode?.inputs.tile_height, 640);
  assert.equal(tiledDiffusionNode?.inputs.tile_overlap, 96);
  assert.equal(tiledDiffusionNode?.inputs.tile_batch_size, 3);
  assert.equal(spotParamsNode?.inputs.shift_method, 'fibonacci');
  assert.equal(spotParamsNode?.inputs.seed, 42);
  assert.deepEqual(guiderNode?.inputs.model, [Object.entries(workflow).find(([, node]: any) => node.class_type === 'SpotDiffusionParams_TiledDiffusion')?.[0], 0]);
  assert.equal(workflowNodeByClass(workflow, 'BNK_TiledKSampler'), null);
  assert.equal(workflow['3'].class_type, 'SamplerCustomAdvanced');
});

test('ComfyUI workflow builds PAG and PerpNegGuider path', () => {
  const pagClass = String.fromCharCode(80, 101, 114, 116, 117, 114, 98, 101, 100, 65, 116, 116, 101, 110, 116, 105, 111, 110, 71, 117, 105, 100, 97, 110, 99, 101);
  const config = resolveComfyUiGenerationConfig(provider('http://127.0.0.1:8188'), {
    prompt: 'forest shrine',
    seed: 123,
    cfg: 6.5,
    sampler_name: 'dpmpp_2m',
    scheduler: 'karras',
    pag: { enabled: true, scale: 2.25 },
    perp_neg_guider: { enabled: true, neg_scale: 1.4 }
  });
  const workflow = buildComfyUiTextToImageWorkflow(config);
  const pagNode = workflowNodeByClass(workflow, pagClass);
  const pagNodeId = Object.entries(workflow).find(([, node]: any) => node.class_type === pagClass)?.[0];
  const guiderNode = workflowNodeByClass(workflow, 'PerpNegGuider');

  assert.equal(pagNode?.inputs.scale, 2.25);
  assert.deepEqual(guiderNode?.inputs.model, [pagNodeId, 0]);
  assert.equal(guiderNode?.inputs.cfg, 6.5);
  assert.equal(guiderNode?.inputs.neg_scale, 1.4);
  assert.equal(workflowNodeByClass(workflow, 'RandomNoise')?.inputs.noise_seed, 123);
  assert.equal(workflowNodeByClass(workflow, 'KSamplerSelect')?.inputs.sampler_name, 'dpmpp_2m');
  assert.equal(workflowNodeByClass(workflow, 'BasicScheduler')?.inputs.scheduler, 'karras');
  assert.equal(workflow['3'].class_type, 'SamplerCustomAdvanced');
});

test('ComfyUI workflow rejects BNK_TiledKSampler together with PerpNegGuider', () => {
  assert.throws(() => resolveComfyUiGenerationConfig(provider('http://127.0.0.1:8188'), {
    prompt: 'forest shrine',
    tiled_generation: { enabled: true },
    perp_neg_guider: { enabled: true }
  }), /BNK_TiledKSampler cannot be combined/);
});

test('ComfyUI resources adapter reads checkpoints, LoRA files, samplers, schedulers and upscale models', async () => {
  await withFakeComfyUi(async (baseUrl) => {
    const settings = provider(baseUrl);
    const checkpoints = await comfyUiProviderAdapter.fetchResources?.(settings, 'checkpoints');
    const loras = await comfyUiProviderAdapter.fetchResources?.(settings, 'loras');
    const samplers = await comfyUiProviderAdapter.fetchResources?.(settings, 'samplers');
    const schedulers = await comfyUiProviderAdapter.fetchResources?.(settings, 'schedulers');
    const upscaleModels = await comfyUiProviderAdapter.fetchResources?.(settings, 'upscale_models');

    assert.deepEqual(checkpoints?.items.map((item) => item.id), ['realistic.safetensors', 'anime.ckpt']);
    assert.deepEqual(loras?.items.map((item) => item.id), ['lineart.safetensors']);
    assert.deepEqual(samplers?.items.map((item) => item.id), ['euler', 'dpmpp_2m']);
    assert.deepEqual(schedulers?.items.map((item) => item.id), ['normal', 'karras']);
    assert.deepEqual(upscaleModels?.items.map((item) => item.id), ['4x-UltraSharp.pth']);
  });
});

test('ComfyUI Hires Fix latent workflow uploads one target image and builds LatentUpscale graph', async () => {
  await withFakeComfyUi(async (baseUrl, received) => {
    const settings = provider(baseUrl);
    const { upstream } = await comfyUiProviderAdapter.submitProviderMode({
      provider: settings,
      providerModeId: 'comfyui.hires-fix',
      transport: { kind: 'multipart', operation: 'provider-submit', path: '/api/provider/submit' },
      payload: {
        prompt: 'restore fox portrait',
        width: 1280,
        height: 720,
        seed: 7,
        hires_upscale_mode: 'latent'
      },
      files: [targetFile()]
    });

    const raw = await upstream.json() as any;
    const promptRequest = received.find((item: any) => item?.prompt) as any;
    const workflow = promptRequest.prompt;
    const latentUpscale = workflowNodeByClass(workflow, 'LatentUpscale');

    assert.equal(raw.comfyui.provider_mode, 'comfyui.hires-fix');
    assert.equal(raw.comfyui.hires_upscale_mode, 'latent');
    assert.equal(raw.comfyui.input_image, 'input.png');
    assert.deepEqual(raw.comfyui.target_size, { width: 1280, height: 720 });
    assert.ok(received.some((item: any) => item?.upload?.bytes > 0));
    assert.equal(workflowNodeByClass(workflow, 'LoadImage')?.inputs.image, 'input.png');
    assert.equal(workflowNodeByClass(workflow, 'VAEEncode')?.class_type, 'VAEEncode');
    assert.equal(latentUpscale?.inputs.width, 1280);
    assert.equal(latentUpscale?.inputs.height, 720);
    assert.equal(workflow['3'].class_type, 'KSampler');
    assert.deepEqual(workflow['3'].inputs.latent_image, [Object.entries(workflow).find(([, node]: any) => node.class_type === 'LatentUpscale')?.[0], 0]);
  });
});

test('ComfyUI Hires Fix can use tiled VAE nodes', async () => {
  await withFakeComfyUi(async (baseUrl, received) => {
    const settings = provider(baseUrl);
    await comfyUiProviderAdapter.submitProviderMode({
      provider: settings,
      providerModeId: 'comfyui.hires-fix',
      transport: { kind: 'multipart', operation: 'provider-submit', path: '/api/provider/submit' },
      payload: {
        prompt: 'restore fox portrait',
        width: 1280,
        height: 720,
        seed: 7,
        hires_upscale_mode: 'latent',
        tiled_vae: { encode: true, decode: true, tile_size: 768, overlap: 96 }
      },
      files: [targetFile()]
    });

    const promptRequest = received.find((item: any) => item?.prompt) as any;
    const workflow = promptRequest.prompt;
    assert.equal(workflowNodeByClass(workflow, 'VAEEncodeTiled')?.inputs.tile_size, 768);
    assert.equal(workflowNodeByClass(workflow, 'VAEDecodeTiled')?.inputs.overlap, 96);
  });
});

test('ComfyUI Hires Fix AI workflow uses UpscaleModelLoader before refinement', async () => {
  await withFakeComfyUi(async (baseUrl, received) => {
    const settings = provider(baseUrl);
    const { upstream } = await comfyUiProviderAdapter.submitProviderMode({
      provider: settings,
      providerModeId: 'comfyui.hires-fix',
      transport: { kind: 'multipart', operation: 'provider-submit', path: '/api/provider/submit' },
      payload: {
        prompt: 'restore fox portrait',
        width: 1536,
        height: 1024,
        seed: 8,
        hires_upscale_mode: 'ai',
        hires_upscale_model: '4x-UltraSharp.pth'
      },
      files: [targetFile()]
    });

    const raw = await upstream.json() as any;
    const promptRequest = received.find((item: any) => item?.prompt) as any;
    const workflow = promptRequest.prompt;

    assert.equal(raw.comfyui.hires_upscale_mode, 'ai');
    assert.equal(raw.comfyui.hires_upscale_model, '4x-UltraSharp.pth');
    assert.equal(workflowNodeByClass(workflow, 'UpscaleModelLoader')?.inputs.model_name, '4x-UltraSharp.pth');
    assert.equal(workflowNodeByClass(workflow, 'ImageUpscaleWithModel')?.class_type, 'ImageUpscaleWithModel');
    assert.equal(workflowNodeByClass(workflow, 'ImageScale')?.inputs.width, 1536);
    assert.equal(workflowNodeByClass(workflow, 'ImageScale')?.inputs.height, 1024);
    assert.equal(workflowNodeByClass(workflow, 'LatentUpscale'), null);
  });
});

test('ComfyUI Hires Fix rejects missing or extra attachments', async () => {
  await withFakeComfyUi(async (baseUrl) => {
    const settings = provider(baseUrl);
    await assert.rejects(
      comfyUiProviderAdapter.submitProviderMode({
        provider: settings,
        providerModeId: 'comfyui.hires-fix',
        transport: { kind: 'multipart', operation: 'provider-submit', path: '/api/provider/submit' },
        payload: { prompt: 'restore fox' },
        files: []
      }),
      /exactly one target image/
    );
    await assert.rejects(
      comfyUiProviderAdapter.submitProviderMode({
        provider: settings,
        providerModeId: 'comfyui.hires-fix',
        transport: { kind: 'multipart', operation: 'provider-submit', path: '/api/provider/submit' },
        payload: { prompt: 'restore fox' },
        files: [targetFile(), targetFile({ fieldname: 'image_reference' })]
      }),
      /exactly one target image/
    );
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
