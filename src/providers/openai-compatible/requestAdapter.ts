import type { ImageParams } from '../../domain/imageParams';
import type { ProviderGenerationModeDefinition } from '../../domain/providerMode';
import type { ProviderProbeReport } from '../../domain/providerProbe';
import type { ProviderSettings } from '../../domain/providerSettings';
import type { WorkMode } from '../../domain/workMode';
import { buildOpenAiCompatibleRequestSurfacePayload } from '../../entities/generation-params/openAiCompatiblePayload';
import {
  getOpenAiCompatibleSize,
  parseOpenAiCompatibleRawJson,
  shouldSendOutputFormat
} from '../../entities/generation-params/serializers/openAiCompatible';
import type { ProviderRequestAdapter, ProviderSubmitProxyRequestInput, ProviderSubmitProxyRequestConfig } from '../../entities/provider/types';
import { resolveModeImageSize } from '../../entities/provider/valueConstraints';
import {
  resolveOpenAiCompatibleLegacyMode,
  resolveOpenAiCompatibleProviderMode
} from '../../entities/generation-params/openai-compatible/modes';

export function getOpenAiCompatibleSizeFromParams(
  params: ImageParams,
  providerMode?: ProviderGenerationModeDefinition | null
): string | undefined {
  return getOpenAiCompatibleSize(params, providerMode);
}

export function validateOpenAiCompatibleCustomSize(
  width: number,
  height: number,
  providerMode?: ProviderGenerationModeDefinition | null
): string[] {
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return ['Размер должен быть числом.'];
  }
  const resolved = resolveModeImageSize(width, height, providerMode, { width, height });
  const messages: string[] = [];
  if (Math.max(width, height) > 4096) messages.push('Максимальная сторона изображения — 4096 px.');
  if (Math.min(width, height) < 1) messages.push('Минимальная сторона изображения — 1 px.');
  if (resolved.width !== width || resolved.height !== height) {
    messages.push(`При отправке размер будет приведён к ${resolved.width}×${resolved.height}.`);
  }
  return messages;
}

export function buildOpenAiCompatibleImagePayload(
  params: ImageParams,
  provider: ProviderSettings,
  mode: WorkMode,
  providerMode?: ProviderGenerationModeDefinition | null
): Record<string, unknown> {
  return buildOpenAiCompatibleRequestSurfacePayload(
    params,
    provider,
    resolveOpenAiCompatibleLegacyMode(providerMode, mode),
    providerMode
  );
}

export function explainOpenAiCompatiblePayloadWarnings(
  payload: Record<string, unknown>,
  provider: ProviderSettings,
  mode: WorkMode,
  capabilityReport: ProviderProbeReport | null,
  providerMode?: ProviderGenerationModeDefinition | null
): string[] {
  const warnings: string[] = [];
  const effectiveMode = resolveOpenAiCompatibleLegacyMode(providerMode, mode);
  const model = String(payload.model ?? provider.modelId).toLowerCase();
  if (model.includes('gpt-image-2')) {
    if (payload.background === 'transparent') warnings.push('gpt-image-2 обычно не принимает background="transparent".');
    if ('input_fidelity' in payload) warnings.push('Для gpt-image-2 input_fidelity обычно лучше не отправлять.');
    if (payload.response_format) warnings.push('GPT Image models и так обычно возвращают base64; response_format часто избыточен.');
  }
  if (payload.output_format === 'png' && 'output_compression' in payload) warnings.push('output_compression работает только для jpeg/webp.');
  if (payload.partial_images && payload.stream !== true) warnings.push('partial_images имеет смысл только когда включён stream.');

  if (capabilityReport) {
    const bucket = effectiveMode === 'generate' ? capabilityReport.generation : capabilityReport.edit;
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
  const providerMode = resolveOpenAiCompatibleProviderMode(input.providerMode, input.mode);

  if (providerMode.submit.kind === 'json') {
    return {
      path: providerMode.submit.path ?? '/api/generate',
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: input.provider,
          payload: input.payload,
          providerModeId: providerMode.id,
          transport: providerMode.submit
        }),
        signal: input.signal
      },
      streamed: input.payload.stream === true,
      fallbackFormat: String(input.payload.output_format ?? 'png')
    };
  }

  const form = new FormData();
  form.append('provider', JSON.stringify(input.provider));
  form.append('payload', JSON.stringify(input.payload));
  form.append('providerModeId', providerMode.id);
  form.append('transport', JSON.stringify(providerMode.submit));
  if (input.targetImage) form.append('image_target', input.targetImage, input.targetImage.name);
  (input.referenceImages ?? []).forEach((file) => form.append('image_reference', file, file.name));
  if (input.mask) form.append('mask', input.mask, input.mask.name);

  return {
    path: providerMode.submit.path ?? '/api/edit',
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
