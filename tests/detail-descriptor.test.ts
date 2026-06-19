import test from 'node:test';
import assert from 'node:assert/strict';
import type { GenerationRequestSnapshot } from '../src/domain/generationTask';
import { defaultImageParams } from '../src/domain/defaults';
import { createDetailDescriptorContext, getProviderDetailDescriptor } from '../src/features/detail/model/detailDescriptors';
import { sentParameters } from '../src/features/detail/sentParameters';
import { sanitizeGenerationTask } from '../src/entities/storage/generationTasks';

const t = (key: string) => key;

function snapshot(overrides: Partial<GenerationRequestSnapshot> = {}): GenerationRequestSnapshot {
  return {
    createdAt: 1000,
    mode: 'generate',
    prompt: 'fox',
    endpoint: 'http://127.0.0.1:8188',
    providerLabel: 'Local ComfyUI',
    model: 'dream.safetensors',
    modelLabel: 'Dream checkpoint',
    payload: { prompt: 'fox', checkpoint: 'dream.safetensors', steps: 20 },
    warnings: [],
    attachments: [],
    params: {
      n: defaultImageParams.n,
      sizeMode: defaultImageParams.sizeMode,
      sizePreset: defaultImageParams.sizePreset,
      width: defaultImageParams.width,
      height: defaultImageParams.height,
      quality: defaultImageParams.quality,
      background: defaultImageParams.background,
      moderation: defaultImageParams.moderation,
      outputFormat: defaultImageParams.outputFormat,
      outputCompression: defaultImageParams.outputCompression,
      stream: defaultImageParams.stream,
      partialImages: defaultImageParams.partialImages,
      responseFormat: defaultImageParams.responseFormat,
      inputFidelity: defaultImageParams.inputFidelity,
      user: defaultImageParams.user,
      style: defaultImageParams.style,
      rawJson: defaultImageParams.rawJson,
      retryAttempts: defaultImageParams.retryAttempts,
      retryDelaySeconds: defaultImageParams.retryDelaySeconds
    },
    ...overrides
  };
}

test('detail descriptor keeps OpenAI-compatible snapshots on request fallback rows', () => {
  const snap = snapshot({
    providerAdapterId: 'openai-compatible',
    surfaceId: 'openai-compatible.logical-params',
    payload: { prompt: 'fox', model: 'gpt-image-2', n: 2 }
  });

  const descriptor = getProviderDetailDescriptor(snap);
  assert.equal(descriptor.kind, 'request-snapshot');
  const rows = descriptor.getParameterRows(createDetailDescriptorContext({ snapshot: snap, t }));
  assert.ok(rows.some((row) => row.id === 'model' && row.value === 'gpt-image-2'));
  assert.ok(rows.some((row) => row.id === 'n' && row.value === '2'));
});

test('detail descriptor surfaces ComfyUI workflow params and runtime data', () => {
  const snap = snapshot({
    providerAdapterId: 'comfyui',
    surfaceId: 'comfyui.text-to-image',
    parameterSummary: {
      surfaceId: 'comfyui.text-to-image',
      title: 'ComfyUI workflow parameters',
      entries: [
        { id: 'checkpoint', label: 'Checkpoint', value: 'dream.safetensors' },
        { id: 'sampler', label: 'Sampler', value: 'euler' },
        { id: 'loras', label: 'LoRA stack', value: 'style.safetensors (0.8/0.7)' }
      ]
    }
  });
  const raw = {
    provider: 'comfyui',
    comfyui: {
      prompt_id: 'abc-123',
      checkpoint: 'dream.safetensors',
      seed: 42,
      workflow: { '1': { class_type: 'CheckpointLoaderSimple' }, '2': { class_type: 'KSampler' } },
      images: [{ filename: 'out.png', type: 'output' }],
      history: { outputs: {} }
    }
  };

  const descriptor = getProviderDetailDescriptor(snap);
  assert.equal(descriptor.kind, 'provider-owned');
  assert.deepEqual(sentParameters(snap, t).map((row) => row.value), ['dream.safetensors', 'euler', 'style.safetensors (0.8/0.7)']);

  const runtime = descriptor.getRuntimeRows?.(createDetailDescriptorContext({ snapshot: snap, raw, t })) ?? [];
  assert.ok(runtime.some((row) => row.id === 'promptId' && row.value === 'abc-123'));
  assert.ok(runtime.some((row) => row.id === 'workflowNodes' && row.value === 2));

  const technical = descriptor.getTechnicalBlocks(createDetailDescriptorContext({ snapshot: snap, raw, t }));
  assert.ok(technical.some((block) => block.id === 'workflow'));
  assert.ok(technical.some((block) => block.id === 'history'));
});

test('legacy ComfyUI snapshots are detected by surface id when adapter id is absent', () => {
  const snap = snapshot({ surfaceId: 'comfyui.text-to-image' });
  assert.equal(getProviderDetailDescriptor(snap).id, 'comfyui.workflow-summary');
});


test('storage sanitizer preserves provider metadata for new snapshots and tolerates old snapshots', () => {
  const newTask = sanitizeGenerationTask({
    id: 'task-provider-meta',
    status: 'succeeded',
    createdAt: 1,
    updatedAt: 2,
    request: snapshot({ providerAdapterId: 'comfyui', surfaceId: 'comfyui.text-to-image' }),
    images: []
  });
  assert.equal(newTask?.request.providerAdapterId, 'comfyui');
  assert.equal(newTask?.request.surfaceId, 'comfyui.text-to-image');

  const oldTask = sanitizeGenerationTask({
    id: 'task-old',
    status: 'succeeded',
    createdAt: 1,
    updatedAt: 2,
    request: { ...snapshot(), providerAdapterId: undefined, surfaceId: undefined },
    images: []
  });
  assert.equal(oldTask?.request.providerAdapterId, undefined);
  assert.equal(getProviderDetailDescriptor(oldTask!.request).kind, 'request-snapshot');
});
