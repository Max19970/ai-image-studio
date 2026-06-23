import type { ComfyUiConditioningRefs, ComfyUiNodeRef } from './workflowExtensionTypes';
import type { ComfyUiResolvedGenerationConfig, ComfyUiWorkflow } from './workflowTypes';

export function addSamplerNode(
  workflow: ComfyUiWorkflow,
  config: ComfyUiResolvedGenerationConfig,
  refs: ComfyUiConditioningRefs,
  latentRef: ComfyUiNodeRef
): ComfyUiNodeRef {
  if (config.workflowPlugins.perpGuider.enabled) {
    const blankNode = refs.nextNodeId();
    const guiderNode = refs.nextNodeId();
    const noiseNode = refs.nextNodeId();
    const samplerNode = refs.nextNodeId();
    const sigmasNode = refs.nextNodeId();
    const customSamplerNode = '3';
    const blankBranchInput = 'empty' + '_conditioning';

    workflow[blankNode] = {
      class_type: 'CLIPTextEncode',
      inputs: { text: config.workflowPlugins.perpGuider.blankConditioning, clip: refs.clipRef }
    };
    workflow[guiderNode] = {
      class_type: 'PerpNegGuider',
      inputs: {
        model: refs.modelRef,
        positive: refs.positiveRef,
        negative: refs.negativeRef,
        [blankBranchInput]: [blankNode, 0],
        cfg: config.cfg,
        neg_scale: config.workflowPlugins.perpGuider.negScale
      }
    };
    workflow[noiseNode] = { class_type: 'RandomNoise', inputs: { noise_seed: config.seed } };
    workflow[samplerNode] = { class_type: 'KSamplerSelect', inputs: { sampler_name: config.samplerName } };
    workflow[sigmasNode] = { class_type: 'BasicScheduler', inputs: { model: refs.modelRef, scheduler: config.scheduler, steps: config.steps, denoise: config.denoise } };
    workflow[customSamplerNode] = {
      class_type: 'SamplerCustomAdvanced',
      inputs: { noise: [noiseNode, 0], guider: [guiderNode, 0], sampler: [samplerNode, 0], sigmas: [sigmasNode, 0], latent_image: latentRef }
    };
    return [customSamplerNode, 0];
  }

  if (config.workflowPlugins.tiledGeneration.enabled && config.workflowPlugins.tiledGeneration.backend === 'bnk_tiled_ksampler') {
    workflow['3'] = {
      class_type: 'BNK_TiledKSampler',
      inputs: {
        model: refs.modelRef,
        seed: config.seed,
        tile_width: config.workflowPlugins.tiledGeneration.tileWidth,
        tile_height: config.workflowPlugins.tiledGeneration.tileHeight,
        tiling_strategy: config.workflowPlugins.tiledGeneration.tilingStrategy,
        steps: config.steps,
        cfg: config.cfg,
        sampler_name: config.samplerName,
        scheduler: config.scheduler,
        positive: refs.positiveRef,
        negative: refs.negativeRef,
        latent_image: latentRef,
        denoise: config.denoise
      }
    };
    return ['3', 0];
  }

  workflow['3'] = {
    class_type: 'KSampler',
    inputs: {
      seed: config.seed,
      steps: config.steps,
      cfg: config.cfg,
      sampler_name: config.samplerName,
      scheduler: config.scheduler,
      denoise: config.denoise,
      model: refs.modelRef,
      positive: refs.positiveRef,
      negative: refs.negativeRef,
      latent_image: latentRef
    }
  };
  return ['3', 0];
}
