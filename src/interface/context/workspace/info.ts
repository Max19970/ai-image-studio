import type { ProviderSettings } from '../../../domain/providerSettings';
import type { ProviderProbeReport } from '../../../domain/providerProbe';
import type { WorkMode } from '../../../domain/workMode';

export interface WorkspaceInfoContext {
  mode: WorkMode;
  provider: ProviderSettings;
  capabilityReport: ProviderProbeReport | null;
  onOpenSettings: () => void;
}
