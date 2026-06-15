import type { ImageParams, ProviderProbeReport, ProviderSettings, WorkMode } from './types';

const isBlank = (value: unknown) => value === undefined || value === null || value === '';

export function getSize(params: ImageParams): string | undefined {
  if (params.sizeMode === 'auto') return 'auto';
  if (params.sizeMode === 'preset') return params.sizePreset || undefined;
  return `${params.width}x${params.height}`;
}

export function validateCustomSize(width: number, height: number): string[] {
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

export function parseRawJson(rawJson: string): Record<string, unknown> {
  const trimmed = rawJson.trim();
  if (!trimmed) return {};
  const parsed = JSON.parse(trimmed);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Raw JSON должен быть объектом, например { "seed": 123 }.');
  }
  return parsed as Record<string, unknown>;
}

export function buildImagePayload(params: ImageParams, provider: ProviderSettings, mode: WorkMode): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    prompt: params.prompt.trim()
  };

  if (params.includeModel && provider.modelId.trim()) payload.model = provider.modelId.trim();
  if (params.includeN) payload.n = params.n;

  const size = getSize(params);
  if (size) payload.size = size;

  if (params.includeQuality && !isBlank(params.quality)) payload.quality = params.quality;
  if (params.includeBackground && !isBlank(params.background)) payload.background = params.background;
  if (params.includeModeration && !isBlank(params.moderation)) payload.moderation = params.moderation;
  if (params.includeOutputFormat && !isBlank(params.outputFormat)) payload.output_format = params.outputFormat;
  if (params.includeOutputCompression && params.outputFormat !== 'png') payload.output_compression = params.outputCompression;
  if (params.includeStream) payload.stream = params.stream;
  if (params.includePartialImages && params.stream) payload.partial_images = params.partialImages;
  if (params.includeResponseFormat && !isBlank(params.responseFormat)) payload.response_format = params.responseFormat;
  if (mode === 'edit' && params.includeInputFidelity && !isBlank(params.inputFidelity)) payload.input_fidelity = params.inputFidelity;
  if (params.includeUser && !isBlank(params.user)) payload.user = params.user.trim();
  if (params.includeStyle && !isBlank(params.style)) payload.style = params.style;

  return {
    ...payload,
    ...parseRawJson(params.rawJson)
  };
}

export function explainPayloadWarnings(payload: Record<string, unknown>, provider: ProviderSettings, mode: WorkMode, capabilityReport: ProviderProbeReport | null): string[] {
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
