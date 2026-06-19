import { ParametersModal } from '../../../parameters/ParametersModal';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { WorkspaceModalsContext } from '../../../../interface/context/workspace/composerDock';

export function WorkspaceSingleParametersModalSection({ context }: ElementDefinitionProps<WorkspaceModalsContext>) {
  return (
    <ParametersModal
      open={context.singleParameters.open}
      mode={context.singleParameters.mode}
      params={context.singleParameters.params}
      provider={context.singleParameters.provider}
      capabilityReport={context.singleParameters.capabilityReport}
      studioSettings={context.singleParameters.studioSettings}
      warnings={context.singleParameters.warnings}
      onClose={context.singleParameters.commands.closeSingle}
      onChange={context.singleParameters.commands.changeSingle}
    />
  );
}
