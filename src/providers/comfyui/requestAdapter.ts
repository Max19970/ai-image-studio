import type { ImageParams } from '../../domain/imageParams';
import type { ProviderProbeReport } from '../../domain/providerProbe';
import type { ProviderSettings } from '../../domain/providerSettings';
import type { WorkMode } from '../../domain/workMode';
import { buildComfyUiPayload } from '../../entities/generation-params/comfyui/state';
import type { ProviderRequestAdapter, ProviderSubmitProxyRequestConfig, ProviderSubmitProxyRequestInput } from '../../entities/provider/types';

export function getComfyUiSizeFromParams(params: ImageParams, provider: ProviderSettings): string | undefined {
  const payload = buildComfyUiPayload(params, provider);
  return `${payload.width}x${payload.height}`;
}

export function validateComfyUiCustomSize(width: number, height: number): string[] {
  const errors: string[] = [];
  if (!Number.isFinite(width) || !Number.isFinite(height)) return ['Размер должен быть числом.'];
  if (width % 8 !== 0 || height % 8 !== 0) errors.push('Для ComfyUI ширина и высота желательно должны быть кратны 8.');
  if (Math.min(width, height) < 64) errors.push('Минимальная сторона ComfyUI-кадра — 64 px.');
  if (Math.max(width, height) > 4096) errors.push('Максимальная сторона ComfyUI-кадра в Image Studio ограничена 4096 px.');
  return errors;
}

export function parseComfyUiRawJson(rawJson: string): Record<string, unknown> {
  const trimmed = rawJson.trim();
  if (!trimmed) return {};
  const parsed = JSON.parse(trimmed);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('ComfyUI raw JSON must be an object.');
  return parsed as Record<string, unknown>;
}

export function buildComfyUiImagePayload(params: ImageParams, provider: ProviderSettings, _mode: WorkMode): Record<string, unknown> {
  return buildComfyUiPayload(params, provider);
}

export function explainComfyUiPayloadWarnings(
  payload: Record<string, unknown>,
  provider: ProviderSettings,
  mode: WorkMode,
  _capabilityReport: ProviderProbeReport | null
): string[] {
  const warnings: string[] = [];
  if (mode !== 'generate') warnings.push('ComfyUI MVP adapter currently supports text-to-image generation only.');
  if (!String(provider.modelId || payload.checkpoint || '').trim()) warnings.push('Select a ComfyUI checkpoint before generation.');
  const width = Number(payload.width);
  const height = Number(payload.height);
  warnings.push(...validateComfyUiCustomSize(width, height));
  if (payload.seed === undefined) warnings.push('Seed is random: ComfyUI will receive a fresh seed on the server for this run.');
  return warnings;
}

export function createComfyUiSubmitProxyRequest(input: ProviderSubmitProxyRequestInput): ProviderSubmitProxyRequestConfig {
  return {
    path: '/api/generate',
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: input.provider, payload: input.payload }),
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
