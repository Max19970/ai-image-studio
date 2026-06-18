import type { ProviderProbeReport, ProviderQuickCheckResult } from '../../../domain/providerProbe';
import type { StudioSettings } from '../../../domain/studioSettings';
import type { SettingsCommands } from '../commands';

export interface SettingsSaveActionContext {
  isDirty: boolean;
  onReset: () => void;
  onSave: () => void;
}

export interface WorkspaceSettingsContext {
  settings: StudioSettings;
  report: ProviderProbeReport | null;
  probingProviderId: string | null;
  quickCheckingProviderId: string | null;
  quickCheckResults: Record<string, ProviderQuickCheckResult>;
  probeError: string | null;
  commands: SettingsCommands;
}
