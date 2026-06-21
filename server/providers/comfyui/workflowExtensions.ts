import type { ComfyUiWorkflowBuildContext, ComfyUiWorkflowExtension, ComfyUiModelConditioningRefs } from './workflowExtensionTypes';

const pagWorkflowExtension: ComfyUiWorkflowExtension = {
  id: 'comfyui.workflow-extension.pag',
  order: 20,
  applyModelConditioning(context: ComfyUiWorkflowBuildContext, refs: ComfyUiModelConditioningRefs): ComfyUiModelConditioningRefs {
    const settings = context.config.workflowPlugins.pag;
    if (!settings.enabled) return refs;
    const nodeId = context.nextNodeId();
    context.workflow[nodeId] = {
      class_type: 'Perturbed' + 'AttentionGuidance',
      inputs: {
        model: refs.modelRef,
        scale: settings.scale
      }
    };
    return { ...refs, modelRef: [nodeId, 0] };
  }
};

const loraStackWorkflowExtension: ComfyUiWorkflowExtension = {
  id: 'comfyui.workflow-extension.lora-stack',
  order: 30,
  applyModelConditioning(context: ComfyUiWorkflowBuildContext, refs: ComfyUiModelConditioningRefs): ComfyUiModelConditioningRefs {
    let modelRef = refs.modelRef;
    let clipRef = refs.clipRef;

    for (const item of context.config.loras) {
      const nodeId = context.nextNodeId();
      context.workflow[nodeId] = {
        class_type: 'LoraLoader',
        inputs: {
          lora_name: item.lora_name,
          strength_model: item.strength_model,
          strength_clip: item.strength_clip,
          model: modelRef,
          clip: clipRef
        }
      };
      modelRef = [nodeId, 0];
      clipRef = [nodeId, 1];
    }

    return { modelRef, clipRef };
  }
};

const tiledDiffusionWorkflowExtension: ComfyUiWorkflowExtension = {
  id: 'comfyui.workflow-extension.tiled-diffusion',
  order: 40,
  applyModelConditioning(context: ComfyUiWorkflowBuildContext, refs: ComfyUiModelConditioningRefs): ComfyUiModelConditioningRefs {
    const settings = context.config.workflowPlugins.tiledGeneration;
    if (!settings.enabled || settings.backend !== 'tiled_diffusion') return refs;
    const tiledDiffusionNode = context.nextNodeId();
    context.workflow[tiledDiffusionNode] = {
      class_type: 'TiledDiffusion',
      inputs: {
        model: refs.modelRef,
        method: settings.method,
        tile_width: settings.tileWidth,
        tile_height: settings.tileHeight,
        tile_overlap: settings.tileOverlap,
        tile_batch_size: settings.tileBatchSize
      }
    };
    let modelRef: ComfyUiModelConditioningRefs['modelRef'] = [tiledDiffusionNode, 0];
    if (settings.method === 'SpotDiffusion') {
      const spotParamsNode = context.nextNodeId();
      context.workflow[spotParamsNode] = {
        class_type: 'SpotDiffusionParams_TiledDiffusion',
        inputs: {
          model: modelRef,
          shift_method: settings.shiftMethod,
          seed: settings.shiftSeed
        }
      };
      modelRef = [spotParamsNode, 0];
    }
    return { ...refs, modelRef };
  }
};

export const comfyUiWorkflowExtensions = [
  pagWorkflowExtension,
  loraStackWorkflowExtension,
  tiledDiffusionWorkflowExtension
] as const satisfies readonly ComfyUiWorkflowExtension[];

export function applyComfyUiModelConditioningExtensions(
  context: ComfyUiWorkflowBuildContext,
  refs: ComfyUiModelConditioningRefs
): ComfyUiModelConditioningRefs {
  return comfyUiWorkflowExtensions
    .slice()
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id))
    .reduce((nextRefs, extension) => extension.applyModelConditioning?.(context, nextRefs) ?? nextRefs, refs);
}
