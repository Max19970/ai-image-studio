export interface StreamEvent {
  type: string;
  [key: string]: unknown;
}

export type ComfyUiProgressEvent = ReturnType<typeof progressEvent>;

export function progressEvent(input: {
  percent?: number | null;
  step?: number | null;
  maxSteps?: number | null;
  stage?: string | null;
  nodeId?: string | null;
  message?: string | null;
}) {
  return {
    providerAdapterId: 'comfyui',
    percent: input.percent ?? null,
    step: input.step ?? null,
    maxSteps: input.maxSteps ?? null,
    stage: input.stage ?? null,
    nodeId: input.nodeId ?? null,
    message: input.message ?? null,
    updatedAt: Date.now()
  };
}

export function keepLastMeasuredProgress(progress: ComfyUiProgressEvent, lastProgress: ComfyUiProgressEvent | null): ComfyUiProgressEvent {
  if (progress.percent !== null || !lastProgress || lastProgress.percent === null) return progress;
  if (progress.stage === 'completed' || progress.stage === 'error') return progress;
  return {
    ...progress,
    percent: lastProgress.percent,
    step: progress.step ?? lastProgress.step,
    maxSteps: progress.maxSteps ?? lastProgress.maxSteps
  };
}

export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
