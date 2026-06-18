import type { BatchComposerDraft } from '../../domain/generationTask';
import type { GenerationModel, GenerationProvider, ProviderSettings } from '../../domain/providerSettings';
import type { ImageParams } from '../../domain/imageParams';
import type { ProviderProbeReport, ProviderQuickCheckResult } from '../../domain/providerProbe';
import type { StudioSettings } from '../../domain/studioSettings';
import type { WorkMode } from '../../domain/workMode';
import type { StateSetter, TaskHistoryCommands, TranslateFn } from './types';

export interface ProviderProbeCommandState {
  setCapabilityReport: StateSetter<ProviderProbeReport | null>;
  setProbeError: StateSetter<string | null>;
  setProbingProviderId: StateSetter<string | null>;
  setQuickCheckingProviderId: StateSetter<string | null>;
  setQuickCheckResults: StateSetter<Record<string, ProviderQuickCheckResult>>;
}

export interface CreateAppCommandsArgs {
  t: TranslateFn;
  mode: WorkMode;
  params: ImageParams;
  provider: ProviderSettings;
  activeProvider: GenerationProvider | null;
  activeModel: GenerationModel | null;
  payload: Record<string, unknown>;
  warnings: string[];
  targetImage: File | null;
  referenceImages: File[];
  mask: File | null;
  canSubmit: boolean;
  batchCanSubmit: boolean;
  batchDrafts: BatchComposerDraft[];
  batchIntervalSeconds: number;
  activeBatchDraft: BatchComposerDraft | null;
  studioSettings: StudioSettings;
  capabilityReport: ProviderProbeReport | null;
  selectedTaskId: string | null;
  taskHistory: TaskHistoryCommands;
  providerProbeState: ProviderProbeCommandState;
  setMode: StateSetter<WorkMode>;
  setParams: StateSetter<ImageParams>;
  setStudioSettings: StateSetter<StudioSettings>;
  setParametersOpen: StateSetter<boolean>;
  setWorkspaceTab: StateSetter<'images' | 'info' | 'settings'>;
  setSidebarCollapsed: StateSetter<boolean>;
  setTargetImage: StateSetter<File | null>;
  setReferenceImages: StateSetter<File[]>;
  setMask: StateSetter<File | null>;
  setSelectedTaskId: StateSetter<string | null>;
  setSelectedImageId: StateSetter<string | null>;
  setBusy: StateSetter<boolean>;
  setBatchComposerOpen: StateSetter<boolean>;
  setBatchDrafts: StateSetter<BatchComposerDraft[]>;
  setBatchIntervalSeconds: StateSetter<number>;
  setBatchParametersDraftId: StateSetter<string | null>;
  normalizeSettings: (settings: StudioSettings) => StudioSettings;
}
