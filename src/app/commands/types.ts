import type { GenerationRequestSnapshot, GenerationTask } from '../../domain/generationTask';
import type { ImageParams } from '../../domain/imageParams';
import type { ProviderProbeReport, ProviderQuickCheckResult } from '../../domain/providerProbe';
import type { ProviderGenerationModeId } from '../../domain/providerMode';
import type { StudioSettings } from '../../domain/studioSettings';
import type { ServerSubmissionState, StateSetter } from '../stateTypes';

export type TranslateFn = (key: string, vars?: Record<string, string | number | boolean | null | undefined>) => string;

export type { StateSetter } from '../stateTypes';

export interface TaskHistoryCommands {
  ingestServerTask: (task: GenerationTask) => void;
  deleteTask: (taskId: string) => void;
  clearTasks: () => void;
}

export type ServerSubmissionSetter = StateSetter<ServerSubmissionState>;

export interface ProviderProbeStateCommands {
  setCapabilityReport: StateSetter<ProviderProbeReport | null>;
  clearCapabilityReport(settings: import('../../domain/providerSettings').ProviderSettings): void;
  setProbeError: StateSetter<string | null>;
  setProbingProviderId: StateSetter<string | null>;
  setQuickCheckingProviderId: StateSetter<string | null>;
  setQuickCheckResults: StateSetter<Record<string, ProviderQuickCheckResult>>;
}

export interface WorkspaceNavigationCommands {
  setSelectedTaskId: StateSetter<string | null>;
  setSelectedImageId: StateSetter<string | null>;
}

export interface RestoreRequestCommands extends WorkspaceNavigationCommands {
  t: TranslateFn;
  setProviderModeId: StateSetter<ProviderGenerationModeId>;
  setCompatibilityNotice: StateSetter<string | null>;
  setParams: StateSetter<ImageParams>;
  settings: StudioSettings;
  setSettings: StateSetter<StudioSettings>;
}
