import { useCallback, useRef } from 'react';
import type { GenerationRequestSnapshot } from '../domain/types';

export function useBatchGenerationRunner() {
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  const runBatch = useCallback(async (
    items: { id: string; snapshot: GenerationRequestSnapshot }[],
    intervalMs: number,
    onItemResult: (id: string, result: any) => void
  ) => {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      const controller = new AbortController();
      abortControllers.current.set(item.id, controller);

      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.snapshot),
          signal: controller.signal
        });

        const data = await res.json();
        onItemResult(item.id, data);
      } catch (e) {
        onItemResult(item.id, { error: String(e) });
      }

      await new Promise(r => setTimeout(r, intervalMs));
    }
  }, []);

  const cancelItem = useCallback((id: string) => {
    abortControllers.current.get(id)?.abort();
    abortControllers.current.delete(id);
  }, []);

  return { runBatch, cancelItem };
}