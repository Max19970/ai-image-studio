import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultImageParams, defaultProviderSettings } from '../src/domain/defaults';
import { buildComfyUiPayload } from '../src/entities/generation-params/comfyui/payload';
import {
  defaultComfyUiParamState,
  toComfyUiProviderParamState
} from '../src/entities/generation-params/comfyui/state';
import {
  buildComfyUiTextToImageWorkflow,
  resolveComfyUiGenerationConfig
} from '../server/providers/comfyui/workflowTemplates';

function workflowNodeByClass(workflow: Record<string, any>, classType: string): any | null {
  return Object.values(workflow).find((node) => node?.class_type === classType) ?? null;
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
        seed: 42,
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
        perpGuiderEnabled: true,
        perpGuiderScale: 1.25,
        loras: [{ name: 'detail.safetensors', strengthModel: 0.8, strengthClip: 0.7, enabled: true }]
      })
    }
  };

  const payload = buildComfyUiPayload(params, provider);
  assert.equal((payload.tiled_generation as any).backend, 'tiled_diffusion');
  assert.equal((payload.perp_neg_guider as any).neg_scale, 1.25);
  assert.equal((payload.loras as any[])[0].lora_name, 'detail.safetensors');

  const config = resolveComfyUiGenerationConfig(provider, payload);
  assert.equal(config.workflowPlugins.tiledGeneration.backend, 'tiled_diffusion');
  assert.equal(config.workflowPlugins.tiledGeneration.shiftMethod, 'fibonacci');
  assert.equal(config.workflowPlugins.pag.scale, 2.5);
  assert.equal(config.workflowPlugins.perpGuider.negScale, 1.25);
  assert.equal(config.loras[0].lora_name, 'detail.safetensors');

  const workflow = buildComfyUiTextToImageWorkflow(config);
  const tiledDiffusionNode = workflowNodeByClass(workflow, 'TiledDiffusion');
  const spotParamsNode = workflowNodeByClass(workflow, 'SpotDiffusionParams_TiledDiffusion');
  const loraNode = workflowNodeByClass(workflow, 'LoraLoader');
  const guiderNode = workflowNodeByClass(workflow, 'PerpNegGuider');

  assert.equal(tiledDiffusionNode?.inputs.tile_width, 704);
  assert.equal(tiledDiffusionNode?.inputs.tile_height, 576);
  assert.equal(spotParamsNode?.inputs.shift_method, 'fibonacci');
  assert.equal(loraNode?.inputs.lora_name, 'detail.safetensors');
  assert.equal(guiderNode?.inputs.neg_scale, 1.25);
  assert.equal(workflowNodeByClass(workflow, 'VAEDecodeTiled')?.inputs.tile_size, 768);
  assert.equal(workflowNodeByClass(workflow, 'BNK_TiledKSampler'), null);
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
