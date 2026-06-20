import {
  HttpError,
  type ProviderFetchContext,
  type ProviderModeSubmitInput,
  type ProviderSettings,
  type UploadedFile,
  type UpstreamRequestResult
} from '../types';
import { resolveComfyUiEndpoint, resolveComfyUiUrl } from './endpoints';
import { fetchComfyUiJson } from './http';
import { describeComfyUiError } from './errorNormalizer';
import { createJsonResponse, mapComfyUiGenerationResult, type ComfyUiPromptResponse } from './responseMapper';
import { selectComfyUiHiresFixTargetImage, uploadComfyUiInputImage } from './imageUpload';
import {
  buildComfyUiHiresFixWorkflow,
  buildComfyUiTextToImageWorkflow,
  resolveComfyUiGenerationConfig,
  resolveComfyUiHiresFixConfig,
  type ComfyUiResolvedGenerationConfig,
  type ComfyUiWorkflow
} from './workflowTemplates';

interface ComfyUiHistoryResponse {
  [promptId: string]: unknown;
}

const comfyUiTextToImageModeIds = new Set([
  'comfyui.legacy-generate',
  'comfyui.text-to-image'
]);

const comfyUiHiresFixModeIds = new Set([
  'comfyui.hires-fix'
]);

function hasNodeErrors(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.keys(value as Record<string, unknown>).length > 0;
}

function buildClientId() {
  return `image-studio-${crypto.randomUUID()}`;
}

function abortIfNeeded(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new HttpError('ComfyUI request was cancelled.', 499);
  }
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(resolve, ms);
    timeout.unref?.();
    const abort = () => {
      clearTimeout(timeout);
      reject(new HttpError('ComfyUI request was cancelled.', 499));
    };
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
  });
}

async function waitForPromptHistory(provider: ProviderSettings, promptId: string, signal?: AbortSignal): Promise<unknown> {
  const started = Date.now();
  const timeoutMs = provider.timeoutMs;
  const pollMs = 750;

  while (Date.now() - started <= timeoutMs) {
    abortIfNeeded(signal);
    const history = await fetchComfyUiJson<ComfyUiHistoryResponse>(provider, resolveComfyUiUrl(provider, `/history/${encodeURIComponent(promptId)}`), {
      method: 'GET',
      timeoutMs,
      signal
    });
    const promptHistory = history?.[promptId];
    if (promptHistory && typeof promptHistory === 'object' && Object.keys(promptHistory as object).length > 0) {
      return promptHistory;
    }
    await sleep(pollMs, signal);
  }

  throw new HttpError(`Timed out waiting for ComfyUI prompt ${promptId}.`, 504);
}

async function runComfyUiWorkflow(args: {
  provider: ProviderSettings;
  workflow: ComfyUiWorkflow;
  config: ComfyUiResolvedGenerationConfig;
  context?: ProviderFetchContext;
}): Promise<UpstreamRequestResult> {
  const endpoint = resolveComfyUiEndpoint(args.provider, 'generate');
  const clientId = buildClientId();

  const promptResponse = await fetchComfyUiJson<ComfyUiPromptResponse>(args.provider, endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: args.workflow, client_id: clientId }),
    timeoutMs: args.provider.timeoutMs,
    signal: args.context?.signal
  });

  if (hasNodeErrors(promptResponse.node_errors)) {
    throw new HttpError(describeComfyUiError(promptResponse, 'ComfyUI workflow validation failed.'), 400);
  }

  const promptId = String(promptResponse.prompt_id ?? '').trim();
  if (!promptId) {
    throw new HttpError(`ComfyUI did not return a prompt_id. Response: ${JSON.stringify(promptResponse)}`, 502);
  }

  const history = await waitForPromptHistory(args.provider, promptId, args.context?.signal);
  const normalized = await mapComfyUiGenerationResult({
    provider: args.provider,
    promptId,
    history,
    workflow: args.workflow,
    config: args.config
  });
  return { endpoint, upstream: createJsonResponse(normalized) };
}

export async function fetchComfyUiGenerate(
  provider: ProviderSettings,
  payload: Record<string, unknown>,
  context: ProviderFetchContext = {}
): Promise<UpstreamRequestResult> {
  const config = resolveComfyUiGenerationConfig(provider, payload);
  const workflow = buildComfyUiTextToImageWorkflow(config);
  return runComfyUiWorkflow({ provider, workflow, config, context });
}

export async function fetchComfyUiHiresFix(
  provider: ProviderSettings,
  payload: Record<string, unknown>,
  files: UploadedFile[],
  context: ProviderFetchContext = {}
): Promise<UpstreamRequestResult> {
  const target = selectComfyUiHiresFixTargetImage(files);
  const uploaded = await uploadComfyUiInputImage(provider, target, context);
  const config = resolveComfyUiHiresFixConfig(provider, payload, uploaded.name);
  const workflow = buildComfyUiHiresFixWorkflow(config);
  return runComfyUiWorkflow({ provider, workflow, config, context });
}

export async function fetchComfyUiEdit(
  _provider: ProviderSettings,
  _payload: Record<string, unknown>,
  _files: UploadedFile[]
): Promise<UpstreamRequestResult> {
  throw new HttpError('ComfyUI MVP provider supports text-to-image generation only. Image edits and masks are not available yet.', 400);
}

export async function submitComfyUiProviderMode(input: ProviderModeSubmitInput): Promise<UpstreamRequestResult> {
  const providerModeId = String(input.providerModeId ?? '');
  const isHiresFix = comfyUiHiresFixModeIds.has(providerModeId);
  const isTextToImage = !providerModeId || comfyUiTextToImageModeIds.has(providerModeId);
  const isLegacyGenerateTransport = input.transport?.operation === 'generate' || input.transport?.kind === 'json';

  if (isHiresFix) {
    if (input.transport?.kind && input.transport.kind !== 'multipart') {
      throw new HttpError('ComfyUI Hires Fix requires multipart provider-submit transport.', 400);
    }
    return fetchComfyUiHiresFix(input.provider, input.payload, input.files, input.context);
  }

  if (isTextToImage || isLegacyGenerateTransport) {
    if (input.files.length > 0 || input.transport?.kind === 'multipart') {
      throw new HttpError('ComfyUI text-to-image mode does not accept image attachments.', 400);
    }
    return fetchComfyUiGenerate(input.provider, input.payload, input.context);
  }

  throw new HttpError(`Unsupported ComfyUI provider mode: ${providerModeId || 'missing providerModeId'}.`, 400);
}
