import { type ProviderSettings } from '../types';
import { resolveComfyUiUrl } from './endpoints';
import { fetchComfyUi, fetchComfyUiJson } from './http';

interface ComfyUiQueueResponse {
  queue_running?: unknown[];
  queue_pending?: unknown[];
}

type QueuePromptState = 'running' | 'pending' | 'missing' | 'unknown';

function queueItemPromptId(item: unknown): string | null {
  if (!Array.isArray(item)) return null;
  const promptId = item[1];
  return typeof promptId === 'string' && promptId.trim() ? promptId : null;
}

function queueContainsPrompt(items: unknown[] | undefined, promptId: string): boolean {
  return (items ?? []).some((item) => queueItemPromptId(item) === promptId);
}

async function readPromptQueueState(provider: ProviderSettings, promptId: string): Promise<QueuePromptState> {
  try {
    const queue = await fetchComfyUiJson<ComfyUiQueueResponse>(provider, resolveComfyUiUrl(provider, '/queue'), {
      method: 'GET',
      timeoutMs: Math.min(provider.timeoutMs, 5_000)
    });
    if (queueContainsPrompt(queue.queue_running, promptId)) return 'running';
    if (queueContainsPrompt(queue.queue_pending, promptId)) return 'pending';
    return 'missing';
  } catch (error) {
    console.warn(`[comfyui] failed to read queue before cancelling prompt ${promptId}:`, error);
    return 'unknown';
  }
}

async function deletePendingPrompt(provider: ProviderSettings, promptId: string): Promise<void> {
  await fetchComfyUi(provider, resolveComfyUiUrl(provider, '/queue'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ delete: [promptId] }),
    timeoutMs: Math.min(provider.timeoutMs, 5_000)
  });
}

async function interruptRunningPrompt(provider: ProviderSettings, promptId: string): Promise<void> {
  await fetchComfyUi(provider, resolveComfyUiUrl(provider, '/interrupt'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt_id: promptId }),
    timeoutMs: Math.min(provider.timeoutMs, 5_000)
  });
}

export async function cancelComfyUiPrompt(provider: ProviderSettings, promptId: string): Promise<void> {
  const normalizedPromptId = promptId.trim();
  if (!normalizedPromptId) return;

  const state = await readPromptQueueState(provider, normalizedPromptId);
  if (state === 'pending') {
    await deletePendingPrompt(provider, normalizedPromptId);
    return;
  }
  if (state === 'running') {
    await interruptRunningPrompt(provider, normalizedPromptId);
    return;
  }
  if (state === 'unknown') {
    await deletePendingPrompt(provider, normalizedPromptId).catch((error) => {
      console.warn(`[comfyui] failed to delete pending prompt ${normalizedPromptId}:`, error);
    });
    await interruptRunningPrompt(provider, normalizedPromptId);
  }
}

export function registerComfyUiPromptCancellation(args: {
  provider: ProviderSettings;
  promptId: string;
  signal?: AbortSignal;
}): () => void {
  const { provider, promptId, signal } = args;
  if (!signal) return () => undefined;

  let cancelled = false;
  const cancel = () => {
    if (cancelled) return;
    cancelled = true;
    void cancelComfyUiPrompt(provider, promptId).catch((error) => {
      console.warn(`[comfyui] failed to cancel prompt ${promptId}:`, error);
    });
  };

  if (signal.aborted) cancel();
  else signal.addEventListener('abort', cancel, { once: true });

  return () => signal.removeEventListener('abort', cancel);
}
