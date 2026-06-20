import { useCallback, useState, type SetStateAction } from 'react';
import type { StateSetter } from '../types';

export interface GenerationExecutionState {
  busy: boolean;
  setBusy: StateSetter<boolean>;
}

export function useGenerationExecutionState(): GenerationExecutionState {
  const [activeRunCount, setActiveRunCount] = useState(0);
  const busy = activeRunCount > 0;

  const setBusy = useCallback((next: SetStateAction<boolean>) => {
    setActiveRunCount((count) => {
      const currentBusy = count > 0;
      const nextBusy = typeof next === 'function' ? next(currentBusy) : next;
      return nextBusy ? count + 1 : Math.max(0, count - 1);
    });
  }, []);

  return {
    busy,
    setBusy
  };
}
