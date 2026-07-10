import { HttpError } from '../../http/httpError';
import type { ComfyUiResolvedWorkflowPlugins } from './workflowTypes';

export function assertWorkflowPluginCompatibility(plugins: ComfyUiResolvedWorkflowPlugins) {
  if (plugins.tiledGeneration.enabled && plugins.tiledGeneration.backend === 'bnk_tiled_ksampler' && plugins.perpGuider.enabled) {
    throw new HttpError('ComfyUI BNK_TiledKSampler cannot be combined with PerpNegGuider in the generated workflow. Use ComfyUI_TiledDiffusion mode or disable one option.', 400);
  }
}
