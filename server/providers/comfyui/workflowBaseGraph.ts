import { applyComfyUiModelConditioningExtensions } from './workflowExtensions';
import {
  createComfyUiNodeAllocator,
  type ComfyUiConditioningRefs,
  type ComfyUiNodeRef,
  type ComfyUiWorkflowNodeAllocator
} from './workflowExtensionTypes';
import { assertWorkflowPluginCompatibility } from './workflowPluginValidation';
import { addSamplerNode } from './workflowSamplerNodes';
import type { ComfyUiResolvedGenerationConfig, ComfyUiWorkflow } from './workflowTypes';

export function addModelConditioningNodes(
  workflow: ComfyUiWorkflow,
  config: ComfyUiResolvedGenerationConfig
): ComfyUiConditioningRefs {
  workflow['4'] = { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: config.checkpoint } };

  const allocator: ComfyUiWorkflowNodeAllocator = createComfyUiNodeAllocator(workflow, 10);
  const conditionedRefs = applyComfyUiModelConditioningExtensions(
    { workflow, config, nextNodeId: allocator.nextNodeId },
    { modelRef: ['4', 0] as ComfyUiNodeRef, clipRef: ['4', 1] as ComfyUiNodeRef }
  );

  workflow['6'] = { class_type: 'CLIPTextEncode', inputs: { text: config.prompt, clip: conditionedRefs.clipRef } };
  workflow['7'] = { class_type: 'CLIPTextEncode', inputs: { text: config.negativePrompt, clip: conditionedRefs.clipRef } };

  return {
    modelRef: conditionedRefs.modelRef,
    clipRef: conditionedRefs.clipRef,
    vaeRef: ['4', 2] as ComfyUiNodeRef,
    positiveRef: ['6', 0] as ComfyUiNodeRef,
    negativeRef: ['7', 0] as ComfyUiNodeRef,
    nextNodeId: allocator.nextNodeId
  };
}

export function addTiledVaeInputs(config: ComfyUiResolvedGenerationConfig) {
  return {
    tile_size: config.workflowPlugins.tiledVae.tileSize,
    overlap: config.workflowPlugins.tiledVae.overlap,
    temporal_size: config.workflowPlugins.tiledVae.temporalSize,
    temporal_overlap: config.workflowPlugins.tiledVae.temporalOverlap
  };
}

export function addVaeEncodeNode(
  workflow: ComfyUiWorkflow,
  config: ComfyUiResolvedGenerationConfig,
  refs: ComfyUiConditioningRefs,
  pixels: ComfyUiNodeRef
): ComfyUiNodeRef {
  const nodeId = refs.nextNodeId();
  workflow[nodeId] = {
    class_type: config.workflowPlugins.tiledVae.encode ? 'VAEEncodeTiled' : 'VAEEncode',
    inputs: {
      pixels,
      vae: refs.vaeRef,
      ...(config.workflowPlugins.tiledVae.encode ? addTiledVaeInputs(config) : {})
    }
  };
  return [nodeId, 0];
}

export function addVaeDecodeAndSave(
  workflow: ComfyUiWorkflow,
  config: ComfyUiResolvedGenerationConfig,
  refs: ComfyUiConditioningRefs,
  samples: ComfyUiNodeRef
) {
  workflow['8'] = {
    class_type: config.workflowPlugins.tiledVae.decode ? 'VAEDecodeTiled' : 'VAEDecode',
    inputs: {
      samples,
      vae: refs.vaeRef,
      ...(config.workflowPlugins.tiledVae.decode ? addTiledVaeInputs(config) : {})
    }
  };
  workflow['9'] = { class_type: 'SaveImage', inputs: { filename_prefix: config.filenamePrefix, images: ['8', 0] } };
}

export function buildComfyUiTextToImageWorkflow(config: ComfyUiResolvedGenerationConfig): ComfyUiWorkflow {
  assertWorkflowPluginCompatibility(config.workflowPlugins);
  const workflow: ComfyUiWorkflow = {
    '5': { class_type: 'EmptyLatentImage', inputs: { width: config.width, height: config.height, batch_size: config.batchSize } }
  };
  const refs = addModelConditioningNodes(workflow, config);
  const sampledRef = addSamplerNode(workflow, config, refs, ['5', 0]);
  addVaeDecodeAndSave(workflow, config, refs, sampledRef);
  return workflow;
}
