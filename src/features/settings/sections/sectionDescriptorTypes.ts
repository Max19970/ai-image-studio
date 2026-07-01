import type { AppFeature } from '../../../shared/features';
import type { SettingsTab } from '../settingsTypes';

export interface SettingsSectionDescriptor {
  id: string;
  tab: SettingsTab;
  elementUse: string;
  order: number;
  labelKey: string;
  hintKey: string;
  requiresFeature?: AppFeature;
}
