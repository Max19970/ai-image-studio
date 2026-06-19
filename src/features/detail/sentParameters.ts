import type { GenerationRequestSnapshot } from '../../domain/generationTask';
import { createDetailDescriptorContext, getProviderDetailDescriptor } from './model/detailDescriptors';

export interface SentParameterRow {
  label: string;
  value: string;
}

export function sentParameters(snapshot: GenerationRequestSnapshot, t: (key: string) => string): SentParameterRow[] {
  const descriptor = getProviderDetailDescriptor(snapshot);
  return descriptor.getParameterRows(createDetailDescriptorContext({ snapshot, t })).map((row) => ({
    label: row.label,
    value: row.value === '' || row.value === null || row.value === undefined ? t('detail.omit') : String(row.value)
  }));
}
