import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultImageParams, defaultProviderSettings } from '../src/domain/defaults';
import { buildComfyUiPayload } from '../src/entities/generation-params/comfyui/payload';
import {
  defaultComfyUiParamState,
  normalizeComfyUiParamState,
  toComfyUiProviderParamState
} from '../src/entities/generation-params/comfyui/state';
import {
  buildComfyUiTextToImageWorkflow,
  resolveComfyUiGenerationConfig
} from '../server/providers/comfyui/workflowTemplates';

function workflowNodeByClass(workflow: Record<string, any>, classType: string): any | null {
  return Object.values(workflow).find((node) => node?.class_type === classType) ?? null;
}

function workflowNodeEntryByClass(workflow: Record<string, any>, classType: string): [string, any] | null {
  return Object.entries(workflow).find(([, node]) => node?.class_type === classType) ?? null;
}

test('ComfyUI UI state maps to payload, resolved server config and workflow plugin nodes', () => {
  const provider = { ...defaultProviderSettings, adapterId: 'comfyui', modelId: 'sdxl.safetensors' };
  const params = {
    ...defaultImageParams,
    prompt: 'contract fox',
    providerParams: {
      comfyui: toComfyUiProviderParamState({
        ...defaultComfyUiParamState,
        width: 768,
        height: 640,
        seedMode: 'fixed',
        seed: 834075337416163,
        workflowBuilder: ['freeuV2', 'pag', 'loraStack', 'tiledGeneration', 'perpGuider', 'tiledVae'],
        tiledGenerationEnabled: true,
        tiledGenerationBackend: 'tiledDiffusion',
        tiledGenerationTileWidth: 704,
        tiledGenerationTileHeight: 576,
        tiledDiffusionMethod: 'SpotDiffusion',
        tiledDiffusionTileOverlap: 80,
        tiledDiffusionTileBatchSize: 2,
        tiledDiffusionShiftMethod: 'fibonacci',
        tiledDiffusionShiftSeed: 123,
        tiledVaeDecodeEnabled: true,
        tiledVaeTileSize: 768,
        tiledVaeOverlap: 96,
        pagEnabled: true,
        pagScale: 2.5,
        freeuV2Enabled: true,
        freeuV2B1: 1.31,
        freeuV2B2: 1.42,
        freeuV2S1: 0.91,
        freeuV2S2: 0.21,
        perpGuiderEnabled: true,
        perpGuiderScale: 1.25,
        loras: [{ name: 'detail.safetensors', strengthModel: 0.8, strengthClip: 0.7, enabled: true }]
      })
    }
  };

  const payload = buildComfyUiPayload(params, provider);
  assert.equal(payload.seed, 834075337416163);
  assert.deepEqual(payload.workflow_order, ['freeu_v2', 'pag', 'lora_stack', 'tiled_generation', 'perp_neg_guider', 'tiled_vae']);
  assert.equal((payload.tiled_generation as any).backend, 'tiled_diffusion');
  assert.equal((payload.perp_neg_guider as any).neg_scale, 1.25);
  assert.deepEqual(payload.freeu_v2, { enabled: true, b1: 1.31, b2: 1.42, s1: 0.91, s2: 0.21 });
  assert.equal((payload.loras as any[])[0].lora_name, 'detail.safetensors');

  const config = resolveComfyUiGenerationConfig(provider, payload);
  assert.equal(config.seed, 834075337416163);
  assert.deepEqual(config.workflowPlugins.order, ['freeu_v2', 'pag', 'lora_stack', 'tiled_generation', 'perp_neg_guider', 'tiled_vae']);
  assert.equal(config.workflowPlugins.tiledGeneration.backend, 'tiled_diffusion');
  assert.equal(config.workflowPlugins.tiledGeneration.shiftMethod, 'fibonacci');
  assert.equal(config.workflowPlugins.pag.scale, 2.5);
  assert.equal(config.workflowPlugins.freeuV2.b1, 1.31);
  assert.equal(config.workflowPlugins.freeuV2.s2, 0.21);
  assert.equal(config.workflowPlugins.perpGuider.negScale, 1.25);
  assert.equal(config.loras[0].lora_name, 'detail.safetensors');

  const workflow = buildComfyUiTextToImageWorkflow(config);
  const tiledDiffusionEntry = workflowNodeEntryByClass(workflow, 'TiledDiffusion');
  const spotParamsNode = workflowNodeByClass(workflow, 'SpotDiffusionParams_TiledDiffusion');
  const loraEntry = workflowNodeEntryByClass(workflow, 'LoraLoader');
  const freeuV2Entry = workflowNodeEntryByClass(workflow, 'FreeU_V2');
  const pagEntry = workflowNodeEntryByClass(workflow, 'PerturbedAttentionGuidance');
  const guiderNode = workflowNodeByClass(workflow, 'PerpNegGuider');
  const tiledDiffusionNode = tiledDiffusionEntry?.[1];
  const loraNode = loraEntry?.[1];
  const freeuV2Node = freeuV2Entry?.[1];
  const pagNode = pagEntry?.[1];

  assert.equal(tiledDiffusionNode?.inputs.tile_width, 704);
  assert.equal(tiledDiffusionNode?.inputs.tile_height, 576);
  assert.equal(spotParamsNode?.inputs.shift_method, 'fibonacci');
  assert.equal(loraNode?.inputs.lora_name, 'detail.safetensors');
  assert.equal(freeuV2Node?.inputs.b1, 1.31);
  assert.equal(freeuV2Node?.inputs.s2, 0.21);
  assert.deepEqual(pagNode?.inputs.model, [freeuV2Entry?.[0], 0]);
  assert.deepEqual(loraNode?.inputs.model, [pagEntry?.[0], 0]);
  assert.deepEqual(tiledDiffusionNode?.inputs.model, [loraEntry?.[0], 0]);
  assert.equal(guiderNode?.inputs.neg_scale, 1.25);
  assert.equal(workflowNodeByClass(workflow, 'VAEDecodeTiled')?.inputs.tile_size, 768);
  assert.equal(workflowNodeByClass(workflow, 'BNK_TiledKSampler'), null);
});

test('ComfyUI lora state deduplicates by name so stale active entries do not survive a later disabled value', () => {
  const state = normalizeComfyUiParamState({
    loras: [
      { name: 'style.safetensors', strengthModel: 1, strengthClip: 1, enabled: true },
      { name: 'style.safetensors', strengthModel: 0.7, strengthClip: 0.6, enabled: false }
    ]
  });

  assert.deepEqual(state.loras, [{
    name: 'style.safetensors',
    strengthModel: 0.7,
    strengthClip: 0.6,
    enabled: false
  }]);
  assert.deepEqual(state.workflowBuilder, []);
});

test('ComfyUI UI BNK tiled backend payload resolves to BNK sampler config and keeps PerpNeg incompatibility server-owned', () => {
  const provider = { ...defaultProviderSettings, adapterId: 'comfyui', modelId: 'sdxl.safetensors' };
  const params = {
    ...defaultImageParams,
    prompt: 'contract fox',
    providerParams: {
      comfyui: toComfyUiProviderParamState({
        ...defaultComfyUiParamState,
        seedMode: 'fixed',
        seed: 7,
        tiledGenerationEnabled: true,
        tiledGenerationBackend: 'bnkTiledKSampler',
        tiledGenerationStrategy: 'randomStrict'
      })
    }
  };

  const payload = buildComfyUiPayload(params, provider);
  assert.equal((payload.tiled_generation as any).backend, 'bnk_tiled_ksampler');
  assert.equal((payload.tiled_generation as any).tiling_strategy, 'random strict');

  const config = resolveComfyUiGenerationConfig(provider, payload);
  assert.equal(config.workflowPlugins.tiledGeneration.backend, 'bnk_tiled_ksampler');
  assert.equal(config.workflowPlugins.tiledGeneration.tilingStrategy, 'random strict');
  assert.equal(workflowNodeByClass(buildComfyUiTextToImageWorkflow(config), 'BNK_TiledKSampler')?.inputs.tiling_strategy, 'random strict');

  const invalidPayload = buildComfyUiPayload({
    ...params,
    providerParams: {
      comfyui: toComfyUiProviderParamState({
        ...defaultComfyUiParamState,
        tiledGenerationEnabled: true,
        tiledGenerationBackend: 'bnkTiledKSampler',
        perpGuiderEnabled: true
      })
    }
  }, provider);
  assert.throws(() => resolveComfyUiGenerationConfig(provider, invalidPayload), /BNK_TiledKSampler cannot be combined/);
});
