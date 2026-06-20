import type { WorkspaceComposerDockContext } from '../../../interface/context/workspace/composerDock';
import type { WorkspaceContextFactoryArgs } from './types';

export function createDockContext({ state, derived, commands }: WorkspaceContextFactoryArgs): WorkspaceComposerDockContext {
  return {
    activeTab: state.workspaceTab,
    batchComposerOpen: state.batchComposerOpen,
    providerModeId: state.providerModeId,
    providerMode: derived.providerMode,
    providerModes: derived.providerModes,
    prompt: state.params.prompt,
    params: state.params,
    provider: derived.provider,
    studioSettings: state.studioSettings,
    busy: state.busy,
    canSubmit: derived.canSubmit,
    targetImage: state.targetImage,
    referenceImages: state.referenceImages,
    mask: state.mask,
    models: state.studioSettings.models,
    providers: state.studioSettings.providers,
    selectedModelId: state.studioSettings.selectedModelId,
    statusText: derived.statusText,
    commands: commands.composer
  };
}
