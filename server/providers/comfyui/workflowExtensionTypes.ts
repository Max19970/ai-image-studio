import type { ComfyUiResolvedGenerationConfig, ComfyUiWorkflow } from './workflowTypes';

export type ComfyUiNodeRef = [string, number];

export interface ComfyUiWorkflowNodeAllocator {
  nextNodeId(): string;
}

export interface ComfyUiWorkflowBuildContext extends ComfyUiWorkflowNodeAllocator {
  workflow: ComfyUiWorkflow;
  config: ComfyUiResolvedGenerationConfig;
}

export interface ComfyUiModelConditioningRefs {
  modelRef: ComfyUiNodeRef;
  clipRef: ComfyUiNodeRef;
}

export interface ComfyUiConditioningRefs extends ComfyUiModelConditioningRefs, ComfyUiWorkflowNodeAllocator {
  vaeRef: ComfyUiNodeRef;
  positiveRef: ComfyUiNodeRef;
  negativeRef: ComfyUiNodeRef;
}

export interface ComfyUiWorkflowExtension {
  id: string;
  order: number;
  applyModelConditioning?: (
    context: ComfyUiWorkflowBuildContext,
    refs: ComfyUiModelConditioningRefs
  ) => ComfyUiModelConditioningRefs;
}

export function createComfyUiNodeAllocator(workflow: ComfyUiWorkflow, startAt = 10): ComfyUiWorkflowNodeAllocator {
  let next = startAt;
  return {
    nextNodeId() {
      while (workflow[String(next)]) next += 1;
      const nodeId = String(next);
      next += 1;
      return nodeId;
    }
  };
}
