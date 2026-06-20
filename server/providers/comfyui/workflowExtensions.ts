import type { ComfyUiWorkflowBuildContext, ComfyUiWorkflowExtension, ComfyUiModelConditioningRefs } from './workflowExtensionTypes';

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

export const comfyUiWorkflowExtensions = [
  loraStackWorkflowExtension
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
