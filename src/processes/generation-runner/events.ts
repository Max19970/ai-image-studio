import type { GeneratedImage, GenerationRequestSnapshot, GenerationStatus } from '../../domain/generationTask';

export type RunnerLifecycleStatus = GenerationStatus;

export type SingleGenerationRunnerEvent =
  | { type: 'queued'; taskId: string; request: GenerationRequestSnapshot }
  | { type: 'started'; taskId: string }
  | { type: 'streaming'; taskId: string; image: GeneratedImage }
  | { type: 'retrying'; taskId: string; attempt: number; totalAttempts: number; error: string; waitMs: number }
  | { type: 'succeeded'; taskId: string; status: 'succeeded'; imageCount: number }
  | { type: 'failed'; taskId: string; status: 'failed'; error: string }
  | { type: 'cancelled'; taskId: string; status: 'cancelled'; error: string };

export type SingleGenerationEventSink = (event: SingleGenerationRunnerEvent) => void;
