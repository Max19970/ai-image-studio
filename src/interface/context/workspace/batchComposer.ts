import type { GenerationModel, GenerationProvider } from '../../../domain/providerSettings';
import type { BatchComposerDraft } from '../../../domain/generationTask';
import type { BatchComposerCommands } from '../commands';

export interface WorkspaceBatchComposerContext {
  drafts: BatchComposerDraft[];
  intervalSeconds: number;
  busy: boolean;
  canSubmit: boolean;
  models: GenerationModel[];
  providers: GenerationProvider[];
  commands: BatchComposerCommands;
}
