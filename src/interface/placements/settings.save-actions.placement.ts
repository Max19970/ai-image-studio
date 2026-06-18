import type { ElementPlacement } from '../registry/types';
import type { SettingsSaveActionContext } from '../context/workspace/settings';

export default [
  {
    id: 'settings.save-actions.reset-changes',
    slot: 'settings/save-actions',
    use: 'settings.resetChanges',
    order: 10
  },
  {
    id: 'settings.save-actions.save-changes',
    slot: 'settings/save-actions',
    use: 'settings.saveChanges',
    order: 20
  }
] satisfies ElementPlacement<SettingsSaveActionContext>[];
