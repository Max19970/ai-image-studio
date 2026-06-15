import type { GeneratedImage, ProviderProbeReport, ProviderQuickCheckResult, ProviderSettings, WorkMode } from '../domain/types';

export interface SubmitRequest {
  provider: ProviderSettings;
  payload: Record<string, unknown>;
  mode: WorkMode;
  targetImage?: File | null;
  referenceImages?: File[];
  mask?: File | null;
  onStreamImage?: (image: GeneratedImage) => void;
  signal?: AbortSignal;
}

function imageFromBase64(base64: string, format = 'png', kind: 'final' | 'partial' = 'final', index = 0, raw?: unknown): GeneratedImage {
  const mime = format === 'jpg' ? 'jpeg' : format;
  return {
    id: crypto.randomUUID(),
    src: `data:image/${mime};base64,${base64}`,
    format: mime,
    kind,
    index,
    createdAt: Date.now(),
    raw
  };
}

function collectImagesFromJson(json: unknown, fallbackFormat = 'png'): GeneratedImage[] {
  const images: GeneratedImage[] = [];
  const root = json as any;
  const format = root?.output_format ?? fallbackFormat;

  if (Array.isArray(root?.data)) {
    root.data.forEach((item: any, index: number) => {
      if (item?.b64_json) images.push(imageFromBase64(item.b64_json, format, 'final', index, item));
      if (item?.url) {
        images.push({ id: crypto.randomUUID(), src: item.url, format: 'url', kind: 'final', index, createdAt: Date.now(), raw: item });
      }
    });
  }

  if (root?.b64_json) images.push(imageFromBase64(root.b64_json, format, root?.type?.includes('partial') ? 'partial' : 'final', root?.partial_image_index ?? 0, root));
  if (root?.image?.b64_json) images.push(imageFromBase64(root.image.b64_json, format, 'final', 0, root));

  return images;
}

async function fetchProxy(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot reach the local app proxy. Make sure the Express server is running on the expected port. Original browser error: ${message}`);
  }
}

function parseSseBlock(block: string): unknown[] {
  const dataLines = block
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .filter((line) => line && line !== '[DONE]');

  return dataLines.flatMap((line) => {
    try {
      return [JSON.parse(line)];
    } catch {
      return [];
    }
  });
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

async function consumeStream(response: Response, onStreamImage?: (image: GeneratedImage) => void): Promise<GeneratedImage[]> {
  if (!response.ok || !response.body) {
    await readJsonOrThrow(response);
    return [];
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const collected: GeneratedImage[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() ?? '';

    for (const block of blocks) {
      for (const event of parseSseBlock(block)) {
        const imgs = collectImagesFromJson(event);
        imgs.forEach((img) => {
          collected.push(img);
          onStreamImage?.(img);
        });
      }
    }
  }

  if (buffer.trim()) {
    for (const event of parseSseBlock(buffer)) {
      const imgs = collectImagesFromJson(event);
      imgs.forEach((img) => {
        collected.push(img);
        onStreamImage?.(img);
      });
    }
  }

  return collected;
}

export async function submitImageRequest(request: SubmitRequest): Promise<{ images: GeneratedImage[]; raw: unknown }> {
  if (request.mode === 'generate') {
    const response = await fetchProxy('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: request.provider, payload: request.payload }),
      signal: request.signal
    });

    if (request.payload.stream === true) {
      const images = await consumeStream(response, request.onStreamImage);
      return { images, raw: null };
    }

    const raw = await readJsonOrThrow(response);
    return { images: collectImagesFromJson(raw, String(request.payload.output_format ?? 'png')), raw };
  }

  const form = new FormData();
  form.append('provider', JSON.stringify(request.provider));
  form.append('payload', JSON.stringify(request.payload));
  if (request.targetImage) form.append('image_target', request.targetImage, request.targetImage.name);
  request.referenceImages?.forEach((file) => form.append('image_reference', file, file.name));
  if (request.mask) form.append('mask', request.mask, request.mask.name);

  const response = await fetchProxy('/api/edit', { method: 'POST', body: form, signal: request.signal });

  if (request.payload.stream === true) {
    const images = await consumeStream(response, request.onStreamImage);
    return { images, raw: null };
  }

  const raw = await readJsonOrThrow(response);
  return { images: collectImagesFromJson(raw, String(request.payload.output_format ?? 'png')), raw };
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
