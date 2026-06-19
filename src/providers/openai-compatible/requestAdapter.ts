import type { ImageParams } from '../../domain/imageParams';
import type { ProviderProbeReport } from '../../domain/providerProbe';
import type { ProviderSettings } from '../../domain/providerSettings';
import type { WorkMode } from '../../domain/workMode';
import { buildOpenAiCompatibleRequestSurfacePayload } from '../../entities/generation-params/requestSurface';
import {
  getOpenAiCompatibleSize,
  parseOpenAiCompatibleRawJson,
  shouldSendOutputFormat
} from '../../entities/generation-params/serializers/openAiCompatible';
import type { ProviderRequestAdapter, ProviderSubmitProxyRequestInput, ProviderSubmitProxyRequestConfig } from '../../entities/provider/types';

export function getOpenAiCompatibleSizeFromParams(params: ImageParams): string | undefined {
  return getOpenAiCompatibleSize(params);
}

export function validateOpenAiCompatibleCustomSize(width: number, height: number): string[] {
  const errors: string[] = [];
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return ['Размер должен быть числом.'];
  }
  if (width % 16 !== 0 || height % 16 !== 0) errors.push('Ширина и высота должны быть кратны 16.');
  if (Math.max(width, height) > 3840) errors.push('Максимальная сторона для GPT Image 2 — 3840 px.');
  const ratio = width / height;
  if (ratio > 3 || ratio < 1 / 3) errors.push('Соотношение сторон должно быть в пределах 1:3..3:1.');
  return errors;
}

export function buildOpenAiCompatibleImagePayload(params: ImageParams, provider: ProviderSettings, mode: WorkMode): Record<string, unknown> {
  return buildOpenAiCompatibleRequestSurfacePayload(params, provider, mode);
}

export function explainOpenAiCompatiblePayloadWarnings(
  payload: Record<string, unknown>,
  provider: ProviderSettings,
  mode: WorkMode,
  capabilityReport: ProviderProbeReport | null
): string[] {
  const warnings: string[] = [];
  const model = String(payload.model ?? provider.modelId).toLowerCase();
  if (model.includes('gpt-image-2')) {
    if (payload.background === 'transparent') warnings.push('gpt-image-2 обычно не принимает background="transparent".');
    if ('input_fidelity' in payload) warnings.push('Для gpt-image-2 input_fidelity обычно лучше не отправлять.');
    if (payload.response_format) warnings.push('GPT Image models и так обычно возвращают base64; response_format часто избыточен.');
  }
  if (payload.output_format === 'png' && 'output_compression' in payload) warnings.push('output_compression работает только для jpeg/webp.');
  if (payload.partial_images && payload.stream !== true) warnings.push('partial_images имеет смысл только когда включён stream.');

  if (capabilityReport) {
    const bucket = mode === 'generate' ? capabilityReport.generation : capabilityReport.edit;
    Object.entries(payload).forEach(([key]) => {
      const capability = bucket[key as keyof typeof bucket];
      if (capability && capability.supported === false) {
        warnings.push(`Провайдер ранее отвергал параметр ${key}. UI обычно скрывает такие поля, но raw JSON всё ещё может их добавить.`);
      }
    });
  }

  return warnings;
}

export function createOpenAiCompatibleSubmitProxyRequest(input: ProviderSubmitProxyRequestInput): ProviderSubmitProxyRequestConfig {
  if (input.mode === 'generate') {
    return {
      path: '/api/generate',
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: input.provider, payload: input.payload }),
        signal: input.signal
      },
      streamed: input.payload.stream === true,
      fallbackFormat: String(input.payload.output_format ?? 'png')
    };
  }

  const form = new FormData();
  form.append('provider', JSON.stringify(input.provider));
  form.append('payload', JSON.stringify(input.payload));
  const images = [input.targetImage, ...(input.referenceImages ?? [])].filter((file): file is File => Boolean(file));
  images.forEach((file) => form.append('image', file, file.name));
  if (input.mask) form.append('mask', input.mask, input.mask.name);

  return {
    path: '/api/edit',
    init: {
      method: 'POST',
      body: form,
      signal: input.signal
    },
    streamed: input.payload.stream === true,
    fallbackFormat: String(input.payload.output_format ?? 'png')
  };
}

export const openAiCompatibleRequestAdapter: ProviderRequestAdapter = {
  getSize: getOpenAiCompatibleSizeFromParams,
  validateCustomSize: validateOpenAiCompatibleCustomSize,
  parseRawJson: parseOpenAiCompatibleRawJson,
  buildImagePayload: buildOpenAiCompatibleImagePayload,
  explainPayloadWarnings: explainOpenAiCompatiblePayloadWarnings,
  createSubmitProxyRequest: createOpenAiCompatibleSubmitProxyRequest
};

export { parseOpenAiCompatibleRawJson, shouldSendOutputFormat };
