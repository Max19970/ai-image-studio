import type { WorkspaceMainContext } from '../../../interface/context/workspace/main';
import type { WorkspaceContextFactoryArgs } from './types';

export function createMainContext({ state, derived, commands }: WorkspaceContextFactoryArgs): WorkspaceMainContext {
  return {
    activeTab: state.workspaceTab,
    batchComposerOpen: state.batchComposerOpen,
    gallery: {
      tasks: state.tasks,
      busy: state.busy,
      commands: commands.gallery
    },
    batchComposer: {
      drafts: state.batchDrafts,
      intervalSeconds: state.batchIntervalSeconds,
      busy: state.busy,
      canSubmit: derived.batchCanSubmit,
      models: state.studioSettings.models,
      providers: state.studioSettings.providers,
      studioSettings: state.studioSettings,
      commands: commands.batchComposer
    },
    info: {},
    settings: {
      settings: state.studioSettings,
      report: state.capabilityReport,
      probingProviderId: state.probingProviderId,
      quickCheckingProviderId: state.quickCheckingProviderId,
      quickCheckResults: state.quickCheckResults,
      probeError: state.probeError,
      commands: commands.settings
    }
  };
}
