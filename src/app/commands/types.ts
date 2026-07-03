import type { GenerationProvider, GenerationModel } from '../../domain/providerSettings';
import type { GenerationRequestSnapshot, GenerationTask } from '../../domain/generationTask';
import type { ImageParams } from '../../domain/imageParams';
import type { ProviderProbeReport, ProviderQuickCheckResult } from '../../domain/providerProbe';
import type { ProviderGenerationModeId } from '../../domain/providerMode';
import type { StudioSettings } from '../../domain/studioSettings';
import type { ServerSubmissionState, StateSetter } from '../stateTypes';

export type TranslateFn = (key: string, vars?: Record<string, string | number | boolean | null | undefined>) => string;

export type { StateSetter } from '../stateTypes';

export interface TaskHistoryCommands {
  setTasks: StateSetter<GenerationTask[]>;
  updateTask: (taskId: string, recipe: (task: GenerationTask) => GenerationTask) => void;
  ingestServerTask: (task: GenerationTask) => void;
  registerAborter: (taskId: string, controller: AbortController) => void;
  releaseAborter: (taskId: string) => void;
  deleteTask: (taskId: string) => void;
  clearTasks: () => void;
}

export type ServerSubmissionSetter = StateSetter<ServerSubmissionState>;

export interface ProviderProbeStateCommands {
  setCapabilityReport: StateSetter<ProviderProbeReport | null>;
  setProbeError: StateSetter<string | null>;
  setProbingProviderId: StateSetter<string | null>;
  setQuickCheckingProviderId: StateSetter<string | null>;
  setQuickCheckResults: StateSetter<Record<string, ProviderQuickCheckResult>>;
}

export interface WorkspaceNavigationCommands {
  setSelectedTaskId: StateSetter<string | null>;
  setSelectedImageId: StateSetter<string | null>;
  setBatchComposerOpen: StateSetter<boolean>;
}

export interface SettingsSelectionContext {
  settings: StudioSettings;
  activeProvider: GenerationProvider | null;
  activeModel: GenerationModel | null;
  setSettings: StateSetter<StudioSettings>;
}

export interface RestoreRequestCommands extends WorkspaceNavigationCommands {
  t: TranslateFn;
  setProviderModeId: StateSetter<ProviderGenerationModeId>;
  setCompatibilityNotice: StateSetter<string | null>;
  setParams: StateSetter<ImageParams>;
  settings: StudioSettings;
  setSettings: StateSetter<StudioSettings>;
}
