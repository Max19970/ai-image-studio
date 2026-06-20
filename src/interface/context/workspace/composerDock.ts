import type { ImageParams } from '../../../domain/imageParams';
import type { GenerationModel, GenerationProvider, ProviderSettings } from '../../../domain/providerSettings';
import type { BatchComposerDraft } from '../../../domain/generationTask';
import type { ProviderProbeReport } from '../../../domain/providerProbe';
import type { ProviderGenerationModeDefinition, ProviderGenerationModeId } from '../../../domain/providerMode';
import type { WorkMode } from '../../../domain/workMode';
import type { StudioSettings } from '../../../domain/studioSettings';
import type { ComposerCommands, ParameterModalCommands } from '../commands';
import type { WorkspaceTab } from './tabs';

export interface WorkspaceComposerDockContext {
  activeTab: WorkspaceTab;
  batchComposerOpen: boolean;
  providerModeId: ProviderGenerationModeId;
  providerMode: ProviderGenerationModeDefinition;
  providerModes: ProviderGenerationModeDefinition[];
  prompt: string;
  params: ImageParams;
  provider: ProviderSettings;
  studioSettings: StudioSettings;
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
    providerMode: ProviderGenerationModeDefinition;
    params: ImageParams;
    provider: ProviderSettings;
    capabilityReport: ProviderProbeReport | null;
    studioSettings: StudioSettings;
    warnings: string[];
    commands: ParameterModalCommands;
  };
  batchParameters: {
    draft: BatchComposerDraft | null;
    provider: ProviderSettings;
    providerMode: ProviderGenerationModeDefinition;
    capabilityReport: ProviderProbeReport | null;
    studioSettings: StudioSettings;
    warnings: string[];
    commands: ParameterModalCommands;
  };
}
