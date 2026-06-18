import type { ImageParams } from '../../../domain/imageParams';
import type { GenerationModel, GenerationProvider, ProviderSettings } from '../../../domain/providerSettings';
import type { BatchComposerDraft } from '../../../domain/generationTask';
import type { ProviderProbeReport } from '../../../domain/providerProbe';
import type { WorkMode } from '../../../domain/workMode';
import type { ComposerCommands, ParameterModalCommands } from '../commands';
import type { WorkspaceTab } from './tabs';

export interface WorkspaceComposerDockContext {
  activeTab: WorkspaceTab;
  batchComposerOpen: boolean;
  mode: WorkMode;
  prompt: string;
  busy: boolean;
  canSubmit: boolean;
  targetImage: File | null;
  referenceImages: File[];
  mask: File | null;
  models: GenerationModel[];
  providers: GenerationProvider[];
  selectedModelId: string;
  statusText: string | null;
  commands: ComposerCommands;
}

export interface WorkspaceModalsContext {
  singleParameters: {
    open: boolean;
    mode: WorkMode;
    params: ImageParams;
    provider: ProviderSettings;
    capabilityReport: ProviderProbeReport | null;
    warnings: string[];
    commands: ParameterModalCommands;
  };
  batchParameters: {
    draft: BatchComposerDraft | null;
    provider: ProviderSettings;
    capabilityReport: ProviderProbeReport | null;
    warnings: string[];
    commands: ParameterModalCommands;
  };
}
