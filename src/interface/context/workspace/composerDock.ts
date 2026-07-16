import type { ImageParams } from '../../../domain/imageParams';
import type { GenerationModel, GenerationProvider, ProviderSettings } from '../../../domain/providerSettings';
import type { ComposerRequestDraft } from '../../../domain/generationTask';
import type { ComposerDraftReadiness, ComposerQueueSummary } from '../../../features/composer/model/composerDraftReadiness';
import type { RequestPreset } from '../../../entities/request-presets';
import type { ProviderProbeReport } from '../../../domain/providerProbe';
import type { ProviderGenerationModeDefinition, ProviderGenerationModeId } from '../../../domain/providerMode';
import type { StudioSettings } from '../../../domain/studioSettings';
import type { ComposerCommands, ParameterModalCommands } from '../commands';
import type { WorkspaceTab } from './tabs';

export interface WorkspaceComposerDockContext {
  activeTab: WorkspaceTab;
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
  requestPresets: RequestPreset[];
  drafts: ComposerRequestDraft[];
  activeDraftId: string;
  draftReadiness: ComposerDraftReadiness[];
  queueSummary: ComposerQueueSummary;
  intervalSeconds: number;
  commands: ComposerCommands;
}

export interface WorkspaceModalsContext {
  composerParameters: {
    draft: ComposerRequestDraft | null;
    provider: ProviderSettings;
    providerMode: ProviderGenerationModeDefinition;
    capabilityReport: ProviderProbeReport | null;
    studioSettings: StudioSettings;
    warnings: string[];
    commands: ParameterModalCommands;
  };
}
