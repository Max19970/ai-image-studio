import { useCallback, useEffect, useState, type SetStateAction } from 'react';
import type { GenerationTask } from '../../../domain/generationTask';
import type { StateSetter } from '../types';

export interface ServerSubmissionState {
  phase: 'idle' | 'submitting' | 'waiting-for-event' | 'failed';
  taskId?: string | null;
  error?: string | null;
}

export interface GenerationExecutionState {
  busy: boolean;
  setBusy: StateSetter<boolean>;
  serverSubmission: ServerSubmissionState;
  setServerSubmission: StateSetter<ServerSubmissionState>;
}

export function useGenerationExecutionState(tasks: GenerationTask[]): GenerationExecutionState {
  const [activeRunCount, setActiveRunCount] = useState(0);
  const [serverSubmission, setServerSubmission] = useState<ServerSubmissionState>({ phase: 'idle' });
  const busy = activeRunCount > 0 || serverSubmission.phase === 'submitting';

  const setBusy = useCallback((next: SetStateAction<boolean>) => {
    setActiveRunCount((count) => {
      const currentBusy = count > 0;
      const nextBusy = typeof next === 'function' ? next(currentBusy) : next;
      return nextBusy ? count + 1 : Math.max(0, count - 1);
    });
  }, []);

  useEffect(() => {
    if (serverSubmission.phase !== 'waiting-for-event' || !serverSubmission.taskId) return;
    if (tasks.some((task) => task.id === serverSubmission.taskId)) {
      setServerSubmission({ phase: 'idle' });
    }
  }, [serverSubmission.phase, serverSubmission.taskId, tasks]);

  return {
    busy,
    setBusy,
    serverSubmission,
    setServerSubmission
  };
}
