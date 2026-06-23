import { isAbortError } from '../../../src/domain/asyncFlow';
import type { GeneratedImage, GenerationProgress, GenerationRequestSnapshot } from '../../../src/domain/generationTask';
import type { ProviderResponseAdapter } from '../../../src/entities/provider/types';
import { createRunnerRetryPolicy, runWithRetryPolicy } from '../../../src/processes/generation-task-lifecycle/retryPolicy';
import { comfyUiResponseAdapter } from '../../../src/providers/comfyui/responseAdapter';
import { openAiCompatibleResponseAdapter } from '../../../src/providers/openai-compatible/responseAdapter';
import { getProviderAdapter } from '../../providers/registry';
import type {
  ProviderPreviewStreamMode,
  ProviderSettings,
  ProviderSubmitTransportDefinition,
  UploadedFile
} from '../../providers/types';
import { sortImages } from './imageState';

export interface ServerGenerationRunInput {
  provider: ProviderSettings;
  payload: Record<string, unknown>;
  providerModeId?: string | null;
  transport?: ProviderSubmitTransportDefinition | null;
  files: UploadedFile[];
  snapshot: GenerationRequestSnapshot;
  previewStreamMode?: ProviderPreviewStreamMode;
  retryAttempts?: number;
  retryDelaySeconds?: number;
  galleryPath?: string;
}

function getResponseAdapter(adapterId: string | undefined): ProviderResponseAdapter {
  return adapterId === 'comfyui' ? comfyUiResponseAdapter : openAiCompatibleResponseAdapter;
}

function isStreamedRun(input: ServerGenerationRunInput): boolean {
  return input.provider.adapterId === 'comfyui' || input.payload.stream === true;
}

async function readJsonOrThrow(response: Response): Promise<unknown> {
  const text = await response.text();
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Keep raw text for upstream error diagnostics.
  }

  if (!response.ok) {
    const root = data && typeof data === 'object' ? data as any : null;
    const error = root?.error ?? root;
    const message = typeof error === 'string'
      ? error
      : ((error?.message ?? root?.message ?? text) || response.statusText || `HTTP ${response.status}`);
    throw new Error(String(message));
  }

  return data;
}

interface RuntimeGenerationStreamHandlers {
  attachImage: (image: GeneratedImage) => GeneratedImage;
  onProgress: (progress: GenerationProgress) => Promise<void>;
  onImage: (image: GeneratedImage) => Promise<void>;
}

async function consumeStreamedRuntimeGeneration(
  response: Response,
  responseAdapter: ProviderResponseAdapter,
  handlers: RuntimeGenerationStreamHandlers
): Promise<GeneratedImage[]> {
  if (!response.ok || !response.body) {
    await readJsonOrThrow(response);
    return [];
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const collected: GeneratedImage[] = [];

  const collectBlock = async (block: string) => {
    for (const event of responseAdapter.parseSseBlock(block)) {
      const streamError = responseAdapter.collectErrorFromJson?.(event);
      if (streamError) throw new Error(streamError);

      const progress = responseAdapter.collectProgressFromJson?.(event);
      if (progress) await handlers.onProgress(progress);

      const images = responseAdapter.collectImagesFromJson(event);
      for (const image of images) {
        const attached = handlers.attachImage(image);
        if (attached.kind === 'final') collected.push(attached);
        await handlers.onImage(attached);
      }
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() ?? '';
    for (const block of blocks) await collectBlock(block);
  }

  if (buffer.trim()) await collectBlock(buffer);
  return collected;
}

export interface RuntimeGenerationRequestHandlers {
  attachImage: (image: GeneratedImage) => GeneratedImage;
  onSending: () => Promise<void> | void;
  onRunning: () => Promise<void> | void;
  onRetry: (args: { attempt: number; totalAttempts: number; error: unknown; waitMs: number }) => Promise<void> | void;
  onProgress: (progress: GenerationProgress) => Promise<void>;
  onImage: (image: GeneratedImage) => Promise<void>;
  onSucceeded: (result: { images: GeneratedImage[]; raw: unknown; streamed: boolean }) => Promise<void>;
  onFailed: (error: unknown, cancelled: boolean) => Promise<void>;
}

function publishRuntimeRequestEvent(action: () => Promise<void> | void, label: string) {
  void Promise.resolve()
    .then(action)
    .catch((error) => console.warn(`[generation-task-runtime] failed to publish ${label}:`, error));
}

async function submitProviderRequest(input: ServerGenerationRunInput, signal: AbortSignal): Promise<Response> {
  const { upstream } = await getProviderAdapter(input.provider.adapterId).submitProviderMode({
    provider: input.provider,
    providerModeId: input.providerModeId,
    transport: input.transport,
    payload: input.payload,
    files: input.files,
    context: {
      signal,
      previewStreamMode: input.previewStreamMode
    }
  });
  return upstream;
}

export async function runGenerationRequestPipeline(args: {
  input: ServerGenerationRunInput;
  signal: AbortSignal;
  handlers: RuntimeGenerationRequestHandlers;
}) {
  const { input, signal, handlers } = args;
  const responseAdapter = getResponseAdapter(input.provider.adapterId);

  try {
    publishRuntimeRequestEvent(handlers.onSending, 'request sending state');
    const upstream = await runWithRetryPolicy({
      policy: createRunnerRetryPolicy({ attempts: input.retryAttempts ?? 0, delaySeconds: input.retryDelaySeconds ?? 0 }),
      run: async () => submitProviderRequest(input, signal),
      onRetry: (retry) => publishRuntimeRequestEvent(() => handlers.onRetry(retry), 'request retry state'),
      signal
    });

    publishRuntimeRequestEvent(handlers.onRunning, 'request running state');

    if (isStreamedRun(input)) {
      const streamedImages = await consumeStreamedRuntimeGeneration(upstream, responseAdapter, handlers);
      await handlers.onSucceeded({ images: sortImages(streamedImages), raw: null, streamed: true });
      return;
    }

    const raw = await readJsonOrThrow(upstream);
    const images = responseAdapter.collectImagesFromJson(raw, String(input.payload.output_format ?? 'png')).map(handlers.attachImage);
    await handlers.onSucceeded({ images, raw, streamed: false });
  } catch (error) {
    const cancelled = isAbortError(error) || signal.aborted;
    await handlers.onFailed(error, cancelled);
  }
}
