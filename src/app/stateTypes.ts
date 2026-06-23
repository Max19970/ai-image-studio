import type { Dispatch, SetStateAction } from 'react';

export type StateSetter<T> = Dispatch<SetStateAction<T>>;

export interface ServerSubmissionState {
  phase: 'idle' | 'submitting' | 'waiting-for-event' | 'failed';
  taskId?: string | null;
  error?: string | null;
}
