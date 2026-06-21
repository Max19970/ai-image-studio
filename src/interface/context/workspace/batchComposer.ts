import type { GenerationModel, GenerationProvider } from '../../../domain/providerSettings';
import type { StudioSettings } from '../../../domain/studioSettings';
import type { BatchComposerDraft } from '../../../domain/generationTask';
import type { RequestPreset } from '../../../entities/request-presets';
import type { BatchComposerCommands } from '../commands';

export interface WorkspaceBatchComposerContext {
  drafts: BatchComposerDraft[];
  intervalSeconds: number;
  busy: boolean;
  canSubmit: boolean;
  models: GenerationModel[];
  providers: GenerationProvider[];
  studioSettings: StudioSettings;
  requestPresets: RequestPreset[];
  commands: BatchComposerCommands;
}
