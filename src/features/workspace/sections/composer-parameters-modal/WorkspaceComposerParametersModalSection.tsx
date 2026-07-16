import { ParametersModal } from '../../../parameters/ParametersModal';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { WorkspaceModalsContext } from '../../../../interface/context/workspace/composerDock';
import { getLegacyWorkModeForProviderMode } from '../../../../entities/provider/modeResolution';

export function WorkspaceComposerParametersModalSection({ context }: ElementDefinitionProps<WorkspaceModalsContext>) {
  const draft = context.composerParameters.draft;
  if (!draft) return null;
  const providerMode = context.composerParameters.providerMode;

  return (
    <ParametersModal
      open
      mode={getLegacyWorkModeForProviderMode(providerMode)}
      providerMode={providerMode}
      params={draft.params}
      provider={context.composerParameters.provider}
      capabilityReport={context.composerParameters.capabilityReport}
      studioSettings={context.composerParameters.studioSettings}
      warnings={context.composerParameters.warnings}
      onClose={context.composerParameters.commands.closeComposer}
      onChange={context.composerParameters.commands.changeComposer}
    />
  );
}
