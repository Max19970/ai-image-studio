import type { GenerationRequestSnapshot } from '../../domain/generationTask';

export interface SentParameterRow {
  label: string;
  value: string;
}

function stringifyParam(value: unknown) {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

export function sentParameters(snapshot: GenerationRequestSnapshot, t: (key: string) => string): SentParameterRow[] {
  const labelMap: Record<string, string> = {
    model: t('detail.param.model'),
    n: t('detail.param.n'),
    size: t('detail.param.size'),
    quality: t('detail.param.quality'),
    background: t('detail.param.background'),
    moderation: t('detail.param.moderation'),
    output_format: t('detail.param.format'),
    output_compression: t('detail.param.compression'),
    stream: t('detail.param.stream'),
    partial_images: t('detail.param.partialImages'),
    response_format: t('detail.param.responseFormat'),
    input_fidelity: t('detail.param.inputFidelity'),
    user: t('detail.param.user'),
    style: t('detail.param.style')
  };

  return Object.entries(snapshot.payload)
    .filter(([key]) => key !== 'prompt')
    .map(([key, value]) => ({ label: labelMap[key] ?? key, value: stringifyParam(value) }));
}
