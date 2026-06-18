import { ParametersModal } from '../../../parameters/ParametersModal';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { WorkspaceModalsContext } from '../../../../interface/context/workspace/composerDock';

export function WorkspaceBatchParametersModalSection({ context }: ElementDefinitionProps<WorkspaceModalsContext>) {
  const draft = context.batchParameters.draft;
  if (!draft) return null;

  return (
    <ParametersModal
      open={Boolean(draft)}
      mode={draft.mode}
      params={draft.params}
      provider={context.batchParameters.provider}
      capabilityReport={context.batchParameters.capabilityReport}
      warnings={context.batchParameters.warnings}
      onClose={context.batchParameters.commands.closeBatch}
      onChange={context.batchParameters.commands.changeBatch}
    />
  );
}
