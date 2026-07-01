import type { GeneratedImage, GenerationProgress, GenerationStatus, GenerationTask } from '../../domain/generationTask';

export type BatchTaskReducerEvent = {
  type: string;
  [key: string]: unknown;
};

export type KnownBatchTaskReducerEvent =
  | { type: 'batch-started' }
  | { type: 'item-sending'; itemId: string }
  | { type: 'item-running'; itemId: string; aggregateError: string | null }
  | { type: 'item-progress'; itemId: string; progress: GenerationProgress; aggregateError: string | null }
  | { type: 'item-streamed'; itemId: string; image: GeneratedImage }
  | { type: 'item-retrying'; itemId: string; retryText: string; aggregateError: string | null }
  | { type: 'item-succeeded'; itemId: string; images: GeneratedImage[]; raw: unknown; streamed: boolean }
  | { type: 'item-failed'; itemId: string; error: string; aggregateError: string }
  | { type: 'item-cancelled'; itemId: string; error: string; aggregateError: string | null }
  | { type: 'active-items-cancelled'; error: string }
  | { type: 'batch-finished'; status: GenerationStatus; error: string | null };

export interface BatchTaskReducerHandler<TEvent extends BatchTaskReducerEvent = BatchTaskReducerEvent> {
  type: TEvent['type'];
  reduce: (task: GenerationTask, event: TEvent, now: number) => GenerationTask;
}
