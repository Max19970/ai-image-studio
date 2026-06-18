import { SettingsPage } from '../../../settings/SettingsPage';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { WorkspaceMainContext } from '../../../../interface/context/workspace/main';

export function WorkspaceSettingsSection({ context }: ElementDefinitionProps<WorkspaceMainContext>) {
  return <SettingsPage {...context.settings} />;
}
