import type { ParameterModalCommands } from '../../interface/context/commands';
import type { ParameterCommandDeps } from './appCommandTypes';

export function createParameterCommands(args: ParameterCommandDeps): ParameterModalCommands {
  return {
    closeSingle: () => args.setParametersOpen(false),
    changeSingle: args.setParams,
    closeBatch: () => args.setBatchParametersDraftId(null),
    changeBatch: (next) => {
      if (!args.activeBatchDraft) return;
      args.setBatchDrafts((prev) => prev.map((draft) => draft.id === args.activeBatchDraft?.id ? { ...draft, params: next } : draft));
    }
  };
}
