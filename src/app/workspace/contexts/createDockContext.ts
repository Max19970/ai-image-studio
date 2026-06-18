import type { WorkspaceComposerDockContext } from '../../../interface/context/workspace/composerDock';
import type { WorkspaceContextFactoryArgs } from './types';

export function createDockContext({ state, derived, commands }: WorkspaceContextFactoryArgs): WorkspaceComposerDockContext {
  return {
    activeTab: state.workspaceTab,
    batchComposerOpen: state.batchComposerOpen,
    mode: state.mode,
    prompt: state.params.prompt,
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
