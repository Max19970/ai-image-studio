import type { RequestPreset } from '../../../../entities/request-presets';
import type { ComposerActionContext } from '../../../composer/composerTypes';

export interface RequestPresetManagerController {
  requestPresets: RequestPreset[];
  defaultName: string;
  saveCurrent: (name?: string, note?: string) => void;
  applyPreset: (presetId: string) => void;
  updatePreset: (presetId: string, patch: { name?: string; note?: string; captureCurrent?: boolean }) => void;
  deletePreset: (presetId: string) => void;
}

function getDefaultDraftName(context: ComposerActionContext) {
  const prompt = context.params.prompt.trim().replace(/\s+/g, ' ');
  if (prompt) return prompt.length > 52 ? `${prompt.slice(0, 49)}…` : prompt;
  return context.selectedModel?.name || context.selectedModel?.modelId || '';
}

export function createComposerPresetManagerController(context: ComposerActionContext): RequestPresetManagerController {
  return {
    requestPresets: context.requestPresets,
    defaultName: getDefaultDraftName(context),
    saveCurrent: context.requestPresetActions.saveCurrent,
    applyPreset: context.requestPresetActions.applyPreset,
    updatePreset: context.requestPresetActions.updatePreset,
    deletePreset: context.requestPresetActions.deletePreset
  };
}
