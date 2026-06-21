import type { GeneratedImage, GenerationProgress } from '../domain/generationTask';
import type { ProviderProbeReport, ProviderQuickCheckResult } from '../domain/providerProbe';
import type { ProviderSettings } from '../domain/providerSettings';
import type { ProviderResourceKind, ProviderResourceList } from '../domain/providerResources';
import type { WorkMode } from '../domain/workMode';
import type { ProviderGenerationModeDefinition } from '../domain/providerMode';
import { getProviderAdapterForSettings } from '../entities/provider/registry';
import type { ProviderResponseAdapter } from '../entities/provider/types';

export interface SubmitRequest {
  provider: ProviderSettings;
  payload: Record<string, unknown>;
  mode: WorkMode;
  providerMode?: ProviderGenerationModeDefinition | null;
  targetImage?: File | null;
  referenceImages?: File[];
  mask?: File | null;
  onStreamImage?: (image: GeneratedImage) => void;
  onProgress?: (progress: GenerationProgress) => void;
  signal?: AbortSignal;
}

async function fetchProxy(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot reach the local app proxy. Make sure the Express server is running on the expected port. Original browser error: ${message}`);
  }
}

function describeApiError(data: unknown, fallback: string): string {
  if (data && typeof data === 'object') {
    const root = data as any;
    const error = root.error ?? root;
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object') {
      const message = error.message ?? error.error?.message ?? root.message;
      const details = error.details ?? error.cause ?? error.code;
      if (message && details) return `${String(message)}\n${typeof details === 'string' ? details : JSON.stringify(details, null, 2)}`;
      if (message) return String(message);
    }
    if (typeof root.message === 'string') return root.message;
  }
  return fallback;
}

async function readJsonOrThrow(response: Response): Promise<unknown> {
  const text = await response.text();
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // keep raw text
  }

  if (!response.ok) {
    throw new Error(describeApiError(data, text || response.statusText || `HTTP ${response.status}`));
  }

  return data;
}

async function consumeStream(
  response: Response,
  responseAdapter: ProviderResponseAdapter,
  onStreamImage?: (image: GeneratedImage) => void,
  onProgress?: (progress: GenerationProgress) => void
): Promise<GeneratedImage[]> {
  if (!response.ok || !response.body) {
    await readJsonOrThrow(response);
    return [];
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const collected: GeneratedImage[] = [];

  const collectBlock = (block: string) => {
    for (const event of responseAdapter.parseSseBlock(block)) {
      const streamError = responseAdapter.collectErrorFromJson?.(event);
      if (streamError) throw new Error(streamError);

      const progress = responseAdapter.collectProgressFromJson?.(event);
      if (progress) onProgress?.(progress);

      const imgs = responseAdapter.collectImagesFromJson(event);
      imgs.forEach((img) => {
        if (img.kind !== 'partial') collected.push(img);
        onStreamImage?.(img);
      });
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() ?? '';
    blocks.forEach(collectBlock);
  }

  if (buffer.trim()) collectBlock(buffer);

  return collected;
}

export async function submitImageRequest(request: SubmitRequest): Promise<{ images: GeneratedImage[]; raw: unknown; streamed: boolean }> {
  const adapter = getProviderAdapterForSettings(request.provider);
  const proxyRequest = adapter.request.createSubmitProxyRequest(request);
  const response = await fetchProxy(proxyRequest.path, proxyRequest.init);

  if (proxyRequest.streamed) {
    const images = await consumeStream(response, adapter.response, request.onStreamImage, request.onProgress);
    return { images, raw: null, streamed: true };
  }

  const raw = await readJsonOrThrow(response);
  return { images: adapter.response.collectImagesFromJson(raw, proxyRequest.fallbackFormat), raw, streamed: false };
}

export async function probeProvider(provider: ProviderSettings): Promise<ProviderProbeReport> {
  const response = await fetchProxy('/api/provider/probe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider })
  });

  const raw = await readJsonOrThrow(response);
  return raw as ProviderProbeReport;
}

export async function quickCheckProvider(provider: ProviderSettings): Promise<ProviderQuickCheckResult> {
  const response = await fetchProxy('/api/provider/quick-check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider })
  });

  const raw = await readJsonOrThrow(response);
  return raw as ProviderQuickCheckResult;
}

export async function fetchProviderResources(provider: ProviderSettings, kind: ProviderResourceKind): Promise<ProviderResourceList> {
  const response = await fetchProxy('/api/provider/resources', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, kind })
  });

  const raw = await readJsonOrThrow(response);
  return raw as ProviderResourceList;
}
