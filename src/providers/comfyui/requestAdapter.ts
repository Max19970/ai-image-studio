import type { ImageParams } from '../../domain/imageParams';
import type { ProviderProbeReport } from '../../domain/providerProbe';
import type { ProviderGenerationModeDefinition } from '../../domain/providerMode';
import type { ProviderSettings } from '../../domain/providerSettings';
import type { WorkMode } from '../../domain/workMode';
import { buildComfyUiPayload } from '../../entities/generation-params/comfyui/state';
import type { ProviderRequestAdapter, ProviderSubmitProxyRequestConfig, ProviderSubmitProxyRequestInput } from '../../entities/provider/types';
import { resolveModeImageSize } from '../../entities/provider/valueConstraints';

export function getComfyUiSizeFromParams(
  params: ImageParams,
  provider: ProviderSettings,
  providerMode?: ProviderGenerationModeDefinition | null
): string | undefined {
  const payload = buildComfyUiPayload(params, provider, providerMode);
  return `${payload.width}x${payload.height}`;
}

export function validateComfyUiCustomSize(
  width: number,
  height: number,
  providerMode?: ProviderGenerationModeDefinition | null
): string[] {
  if (!Number.isFinite(width) || !Number.isFinite(height)) return ['Размер должен быть числом.'];
  const resolved = resolveModeImageSize(width, height, providerMode, { width, height });
  const messages: string[] = [];
  if (Math.min(width, height) < 64) messages.push('Минимальная сторона ComfyUI-кадра — 64 px.');
  if (Math.max(width, height) > 4096) messages.push('Максимальная сторона ComfyUI-кадра в Image Studio ограничена 4096 px.');
  if (resolved.width !== width || resolved.height !== height) {
    messages.push(`При отправке размер будет приведён к ${resolved.width}×${resolved.height}.`);
  }
  return messages;
}

export function parseComfyUiRawJson(rawJson: string): Record<string, unknown> {
  const trimmed = rawJson.trim();
  if (!trimmed) return {};
  const parsed = JSON.parse(trimmed);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('ComfyUI raw JSON must be an object.');
  return parsed as Record<string, unknown>;
}

export function buildComfyUiImagePayload(params: ImageParams, provider: ProviderSettings, _mode: WorkMode, providerMode: ProviderGenerationModeDefinition | null = null): Record<string, unknown> {
  return buildComfyUiPayload(params, provider, providerMode);
}

export function explainComfyUiPayloadWarnings(
  payload: Record<string, unknown>,
  provider: ProviderSettings,
  mode: WorkMode,
  _capabilityReport: ProviderProbeReport | null,
  providerMode: ProviderGenerationModeDefinition | null = null
): string[] {
  const warnings: string[] = [];
  if (mode !== 'generate' && !providerMode) warnings.push('ComfyUI adapter no longer uses legacy edit mode; choose a ComfyUI provider mode instead.');
  if (!String(provider.modelId || payload.checkpoint || '').trim()) warnings.push('Select a ComfyUI checkpoint before generation.');
  const width = Number(payload.width);
  const height = Number(payload.height);
  warnings.push(...validateComfyUiCustomSize(width, height));
  if (payload.seed === undefined) warnings.push('Seed is random: ComfyUI will receive a fresh seed on the server for this run.');
  return warnings;
}

export function createComfyUiSubmitProxyRequest(input: ProviderSubmitProxyRequestInput): ProviderSubmitProxyRequestConfig {
  const submit = input.providerMode?.submit ?? { kind: 'json' as const, operation: 'generate' as const, path: '/api/provider/submit' };
  const providerModeId = input.providerMode?.id ?? null;

  if (submit.kind === 'multipart') {
    const form = new FormData();
    form.append('provider', JSON.stringify(input.provider));
    form.append('payload', JSON.stringify(input.payload));
    if (providerModeId) form.append('providerModeId', providerModeId);
    form.append('transport', JSON.stringify(submit));
    if (input.targetImage) form.append('image_target', input.targetImage, input.targetImage.name);
    (input.referenceImages ?? []).forEach((file) => form.append('image_reference', file, file.name));
    if (input.mask) form.append('mask', input.mask, input.mask.name);

    return {
      path: submit.path ?? '/api/provider/submit',
      init: {
        method: 'POST',
        body: form,
        signal: input.signal
      },
      streamed: false,
      fallbackFormat: 'png'
    };
  }

  return {
    path: submit.path ?? '/api/provider/submit',
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: input.provider, payload: input.payload, providerModeId, transport: submit }),
      signal: input.signal
    },
    streamed: false,
    fallbackFormat: 'png'
  };
}

export const comfyUiRequestAdapter: ProviderRequestAdapter = {
  getSize: (params) => `${Number(params.providerParams?.comfyui?.width ?? 1024)}x${Number(params.providerParams?.comfyui?.height ?? 1024)}`,
  validateCustomSize: validateComfyUiCustomSize,
  parseRawJson: parseComfyUiRawJson,
  buildImagePayload: buildComfyUiImagePayload,
  explainPayloadWarnings: explainComfyUiPayloadWarnings,
  createSubmitProxyRequest: createComfyUiSubmitProxyRequest
};
