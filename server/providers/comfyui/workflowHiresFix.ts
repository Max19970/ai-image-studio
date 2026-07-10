import { HttpError } from '../../http/httpError';
import {
  addModelConditioningNodes,
  addVaeDecodeAndSave,
  addVaeEncodeNode
} from './workflowBaseGraph';
import { assertWorkflowPluginCompatibility } from './workflowPluginValidation';
import { addSamplerNode } from './workflowSamplerNodes';
import type { ComfyUiNodeRef } from './workflowExtensionTypes';
import type { ComfyUiResolvedGenerationConfig, ComfyUiWorkflow } from './workflowTypes';

export function buildComfyUiHiresFixWorkflow(config: ComfyUiResolvedGenerationConfig): ComfyUiWorkflow {
  assertWorkflowPluginCompatibility(config.workflowPlugins);
  if (!config.inputImageName) throw new HttpError('ComfyUI Hires Fix workflow requires an uploaded input image.', 400);
  const workflow: ComfyUiWorkflow = {};
  const refs = addModelConditioningNodes(workflow, config);
  const loadImageNode = refs.nextNodeId();

  workflow[loadImageNode] = { class_type: 'LoadImage', inputs: { image: config.inputImageName } };

  let latentRef: ComfyUiNodeRef;
  if (config.hiresUpscaleMode === 'ai') {
    const modelLoaderNode = refs.nextNodeId();
    const imageUpscaleNode = refs.nextNodeId();
    const imageScaleNode = refs.nextNodeId();

    workflow[modelLoaderNode] = { class_type: 'UpscaleModelLoader', inputs: { model_name: config.hiresUpscaleModel } };
    workflow[imageUpscaleNode] = { class_type: 'ImageUpscaleWithModel', inputs: { upscale_model: [modelLoaderNode, 0], image: [loadImageNode, 0] } };
    workflow[imageScaleNode] = {
      class_type: 'ImageScale',
      inputs: { image: [imageUpscaleNode, 0], upscale_method: 'lanczos', width: config.width, height: config.height, crop: 'disabled' }
    };
    latentRef = addVaeEncodeNode(workflow, config, refs, [imageScaleNode, 0]);
  } else {
    const encodedRef = addVaeEncodeNode(workflow, config, refs, [loadImageNode, 0]);
    const latentUpscaleNode = refs.nextNodeId();
    workflow[latentUpscaleNode] = {
      class_type: 'LatentUpscale',
      inputs: { samples: encodedRef, upscale_method: 'nearest-exact', width: config.width, height: config.height, crop: 'disabled' }
    };
    latentRef = [latentUpscaleNode, 0];
  }

  const sampledRef = addSamplerNode(workflow, config, refs, latentRef);
  addVaeDecodeAndSave(workflow, config, refs, sampledRef);
  return workflow;
}
