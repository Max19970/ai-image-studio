import type { GeneratedImage, GenerationRequestSnapshot, GenerationStatus } from '../../domain/generationTask';
import type { RunnerLifecycleStatus } from '../generation-runner/events';

export type BatchRunnerEvent =
  | { type: 'queued'; taskId: string; request: GenerationRequestSnapshot; itemCount: number; intervalMs: number }
  | { type: 'started'; taskId: string; itemCount: number; intervalMs: number }
  | { type: 'item-queued'; taskId: string; itemId: string; itemIndex: number }
  | { type: 'item-started'; taskId: string; itemId: string; itemIndex: number }
  | { type: 'item-streaming'; taskId: string; itemId: string; itemIndex: number; image: GeneratedImage }
  | { type: 'item-retrying'; taskId: string; itemId: string; itemIndex: number; attempt: number; totalAttempts: number; error: string; waitMs: number }
  | { type: 'item-succeeded'; taskId: string; itemId: string; itemIndex: number; status: 'succeeded'; imageCount: number }
  | { type: 'item-failed'; taskId: string; itemId: string; itemIndex: number; status: 'failed'; error: string }
  | { type: 'item-cancelled'; taskId: string; itemId: string; itemIndex: number; status: 'cancelled'; error: string }
  | { type: 'succeeded'; taskId: string; status: 'succeeded'; error: null }
  | { type: 'failed'; taskId: string; status: 'failed'; error: string }
  | { type: 'cancelled'; taskId: string; status: 'cancelled'; error: string };

export type BatchRunnerTerminalEvent = Extract<BatchRunnerEvent, { type: 'succeeded' | 'failed' | 'cancelled' }>;
export type BatchRunnerItemTerminalEvent = Extract<BatchRunnerEvent, { type: 'item-succeeded' | 'item-failed' | 'item-cancelled' }>;
export type BatchRunnerStatus = RunnerLifecycleStatus;
export type BatchRunnerTaskStatus = GenerationStatus;

export type BatchEventSink = (event: BatchRunnerEvent) => void;
