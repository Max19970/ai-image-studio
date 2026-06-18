import { useState } from 'react';
import type { BatchComposerDraft } from '../../../domain/generationTask';
import type { StateSetter } from '../types';

export interface BatchWorkspaceState {
  batchComposerOpen: boolean;
  setBatchComposerOpen: StateSetter<boolean>;
  batchDrafts: BatchComposerDraft[];
  setBatchDrafts: StateSetter<BatchComposerDraft[]>;
  batchIntervalSeconds: number;
  setBatchIntervalSeconds: StateSetter<number>;
  batchParametersDraftId: string | null;
  setBatchParametersDraftId: StateSetter<string | null>;
}

export function useBatchWorkspaceState(): BatchWorkspaceState {
  const [batchComposerOpen, setBatchComposerOpen] = useState(false);
  const [batchDrafts, setBatchDrafts] = useState<BatchComposerDraft[]>([]);
  const [batchIntervalSeconds, setBatchIntervalSeconds] = useState(4);
  const [batchParametersDraftId, setBatchParametersDraftId] = useState<string | null>(null);

  return {
    batchComposerOpen,
    setBatchComposerOpen,
    batchDrafts,
    setBatchDrafts,
    batchIntervalSeconds,
    setBatchIntervalSeconds,
    batchParametersDraftId,
    setBatchParametersDraftId
  };
}
