import type { WorkspaceMainContext } from '../../../interface/context/workspace/main';
import type { WorkspaceContextFactoryArgs } from './types';

export function createMainContext({ state, commands }: WorkspaceContextFactoryArgs): WorkspaceMainContext {
  return {
    activeTab: state.workspaceTab,
    gallery: {
      tasks: state.tasks,
      busy: state.busy,
      commands: commands.gallery
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
