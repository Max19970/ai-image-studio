import type { ParameterModalCommands } from '../../interface/context/commands';
import type { ParameterCommandDeps } from './appCommandTypes';

export function createParameterCommands(args: ParameterCommandDeps): ParameterModalCommands {
  return {
    closeComposer: () => args.setComposerParametersDraftId(null),
    changeComposer: (params) => {
      if (!args.activeComposerDraft) return;
      args.patchComposerDraft(args.activeComposerDraft.id, { params });
    }
  };
}
