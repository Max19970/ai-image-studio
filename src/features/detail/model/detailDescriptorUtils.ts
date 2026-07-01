import type { GenerationRequestSnapshot } from '../../../domain/generationTask';
import type { DetailDataRow, DetailDescriptorContext } from './detailDescriptorTypes';

export function stringifyDetailParam(value: unknown) {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

export function readNestedRecord(value: unknown, key: string): Record<string, unknown> | null {
  const root = asRecord(value);
  return root ? asRecord(root[key]) : null;
}

export function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function fallbackParamRows(snapshot: GenerationRequestSnapshot, t: DetailDescriptorContext['t']): DetailDataRow[] {
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
    .map(([key, value]) => ({ id: key, label: labelMap[key] ?? key, value: stringifyDetailParam(value) }));
}

export function summaryRows(snapshot: GenerationRequestSnapshot, t: DetailDescriptorContext['t']): DetailDataRow[] {
  return snapshot.parameterSummary?.entries?.map((entry) => ({
    id: entry.id,
    label: t(`detail.comfy.param.${entry.id}`) === `detail.comfy.param.${entry.id}` ? entry.label : t(`detail.comfy.param.${entry.id}`),
    value: entry.value
  })) ?? [];
}

export function requestModeLabel(snapshot: GenerationRequestSnapshot, t: DetailDescriptorContext['t']): string {
  return snapshot.providerModeLabel || t(`gallery.mode.${snapshot.mode}`);
}

export function defaultMetadataRows(snapshot: GenerationRequestSnapshot, t: DetailDescriptorContext['t']): DetailDataRow[] {
  return [
    { id: 'mode', label: t('detail.mode'), value: requestModeLabel(snapshot, t) },
    { id: 'model', label: t('detail.model'), value: snapshot.modelLabel || snapshot.model || t('detail.notSet') },
    { id: 'provider', label: t('detail.provider'), value: snapshot.providerLabel || t('detail.notSet') },
    { id: 'endpoint', label: t('detail.endpoint'), value: snapshot.endpoint || t('detail.notSet') },
    { id: 'created', label: t('detail.created'), value: new Date(snapshot.createdAt).toLocaleString() }
  ];
}
