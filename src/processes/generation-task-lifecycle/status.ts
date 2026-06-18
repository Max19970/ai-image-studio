export {
  ACTIVE_GENERATION_STATUSES,
  GENERATION_LIFECYCLE_STATUSES,
  TERMINAL_GENERATION_STATUSES,
  batchItemHasActiveWork,
  interruptedStatusToFailed,
  isActiveGenerationStatus,
  isGenerationStatus,
  isTerminalGenerationStatus,
  normalizeGenerationStatus,
  statusToUiTone,
  taskHasActiveWork
} from '../../domain/generationStatus';

export type { GenerationLifecycleStatus, PersistedGenerationStatus } from '../../domain/generationStatus';
