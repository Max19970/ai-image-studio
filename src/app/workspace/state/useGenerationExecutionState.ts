import { useState } from 'react';
import type { StateSetter } from '../types';

export interface GenerationExecutionState {
  busy: boolean;
  setBusy: StateSetter<boolean>;
}

export function useGenerationExecutionState(): GenerationExecutionState {
  const [busy, setBusy] = useState(false);

  return {
    busy,
    setBusy
  };
}
