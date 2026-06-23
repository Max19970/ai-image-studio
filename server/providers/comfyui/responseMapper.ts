import { HttpError, type ProviderSettings } from '../types';
import { resolveComfyUiUrl } from './endpoints';
import { fetchComfyUi } from './http';
import type { ComfyUiResolvedGenerationConfig, ComfyUiWorkflow } from './workflowTypes';

export interface ComfyUiImageRef {
  filename: string;
  subfolder?: string;
  type?: string;
}

export interface ComfyUiPromptResponse {
  prompt_id?: string;
  number?: number;
  node_errors?: unknown;
}

export interface ComfyUiGenerationResult {
  data: { b64_json: string; revised_prompt?: string; comfyui: ComfyUiImageRef }[];
  output_format: string;
  provider: 'comfyui';
  comfyui: {
    prompt_id: string;
    checkpoint: string;
    seed: number;
    workflow: ComfyUiWorkflow;
    images: ComfyUiImageRef[];
    history: unknown;
    provider_mode?: string;
    hires_upscale_mode?: string;
    hires_upscale_model?: string;
    input_image?: string;
    target_size?: { width: number; height: number };
  };
}

function hasImageRef(value: unknown): value is ComfyUiImageRef {
  return Boolean(value && typeof value === 'object' && typeof (value as any).filename === 'string');
}

export function collectComfyUiOutputImages(history: unknown): ComfyUiImageRef[] {
  const root = history as any;
  const firstHistoryValue = Object.values((root ?? {}) as Record<string, any>)[0] as any;
  const outputs = root?.outputs ?? firstHistoryValue?.outputs;
  if (!outputs || typeof outputs !== 'object') return [];

  const images: ComfyUiImageRef[] = [];
  for (const output of Object.values(outputs as Record<string, any>)) {
    const list = output?.images;
    if (!Array.isArray(list)) continue;
    list.forEach((item) => {
      if (hasImageRef(item)) {
        images.push({
          filename: item.filename,
          subfolder: item.subfolder ?? '',
          type: item.type ?? 'output'
        });
      }
    });
  }
  return images;
}


function compactComfyUiStatusMessages(messages: unknown): string | undefined {
  if (!Array.isArray(messages)) return undefined;
  const parts = messages.flatMap((item): string[] => {
    if (typeof item === 'string') return [item];
    if (!Array.isArray(item)) return [];
    const [, payload] = item;
    if (typeof payload === 'string') return [payload];
    if (payload && typeof payload === 'object') {
      const source = payload as any;
      return [source.exception_message, source.message, source.node_id ? `node ${source.node_id}` : ''].filter(Boolean).map(String);
    }
    return [];
  });
  return [...new Set(parts)].slice(0, 8).join(' · ') || undefined;
}

export function describeComfyUiHistoryFailure(history: unknown): string | null {
  const root = history as any;
  const firstHistoryValue = Object.values((root ?? {}) as Record<string, any>)[0] as any;
  const status = root?.status ?? firstHistoryValue?.status;
  if (!status || typeof status !== 'object') return null;
  const statusStr = String(status.status_str ?? '').toLowerCase();
  const completed = status.completed;
  if (statusStr && statusStr !== 'success' && statusStr !== 'completed') {
    const details = compactComfyUiStatusMessages(status.messages);
    return `ComfyUI workflow finished with status "${status.status_str}".${details ? ` ${details}` : ''}`;
  }
  if (completed === false) {
    const details = compactComfyUiStatusMessages(status.messages);
    return `ComfyUI workflow did not complete.${details ? ` ${details}` : ''}`;
  }
  return null;
}

function extensionToFormat(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || 'png';
  return ext === 'jpg' ? 'jpeg' : ext;
}

async function imageRefToBase64(provider: ProviderSettings, image: ComfyUiImageRef): Promise<string> {
  const url = new URL(resolveComfyUiUrl(provider, '/view'));
  url.searchParams.set('filename', image.filename);
  url.searchParams.set('subfolder', image.subfolder ?? '');
  url.searchParams.set('type', image.type ?? 'output');

  const response = await fetchComfyUi(provider, url.toString(), {
    method: 'GET',
    timeoutMs: provider.timeoutMs
  });
  if (!response.ok) {
    throw new HttpError(`ComfyUI image fetch failed for ${image.filename}: ${response.statusText || response.status}`, response.status);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  return bytes.toString('base64');
}

export async function mapComfyUiGenerationResult(args: {
  provider: ProviderSettings;
  promptId: string;
  history: unknown;
  workflow: ComfyUiWorkflow;
  config: ComfyUiResolvedGenerationConfig;
}): Promise<ComfyUiGenerationResult> {
  const historyFailure = describeComfyUiHistoryFailure(args.history);
  if (historyFailure) {
    throw new HttpError(`${historyFailure} Prompt id: ${args.promptId}.`, 502);
  }

  const images = collectComfyUiOutputImages(args.history);
  if (!images.length) {
    throw new HttpError(`ComfyUI finished prompt ${args.promptId}, but no output images were found in history.`, 502);
  }

  const firstFormat = extensionToFormat(images[0].filename);
  const data = await Promise.all(images.map(async (image) => ({
    b64_json: await imageRefToBase64(args.provider, image),
    revised_prompt: args.config.prompt,
    comfyui: image
  })));

  return {
    data,
    output_format: firstFormat,
    provider: 'comfyui',
    comfyui: {
      prompt_id: args.promptId,
      checkpoint: args.config.checkpoint,
      seed: args.config.seed,
      workflow: args.workflow,
      images,
      history: args.history,
      ...(args.config.providerMode ? { provider_mode: args.config.providerMode } : {}),
      ...(args.config.hiresUpscaleMode ? { hires_upscale_mode: args.config.hiresUpscaleMode } : {}),
      ...(args.config.hiresUpscaleModel ? { hires_upscale_model: args.config.hiresUpscaleModel } : {}),
      ...(args.config.inputImageName ? {
        input_image: args.config.inputImageName,
        target_size: { width: args.config.width, height: args.config.height }
      } : {})
    }
  };
}

export function createJsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}
