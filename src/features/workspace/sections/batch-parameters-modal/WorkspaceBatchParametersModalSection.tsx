import { ParametersModal } from '../../../parameters/ParametersModal';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { WorkspaceModalsContext } from '../../../../interface/context/workspace/composerDock';
import { getLegacyWorkModeForProviderMode } from '../../../../entities/provider/modeResolution';

export function WorkspaceBatchParametersModalSection({ context }: ElementDefinitionProps<WorkspaceModalsContext>) {
  const draft = context.batchParameters.draft;
  if (!draft) return null;

  const providerMode = context.batchParameters.providerMode;

  return (
    <ParametersModal
      open={Boolean(draft)}
      mode={getLegacyWorkModeForProviderMode(providerMode)}
      providerMode={providerMode}
      params={draft.params}
      provider={context.batchParameters.provider}
      capabilityReport={context.batchParameters.capabilityReport}
      studioSettings={context.batchParameters.studioSettings}
      warnings={context.batchParameters.warnings}
      onClose={context.batchParameters.commands.closeBatch}
      onChange={context.batchParameters.commands.changeBatch}
    />
  );
}
