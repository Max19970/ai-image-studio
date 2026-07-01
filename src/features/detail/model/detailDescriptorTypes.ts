import type { GeneratedImage, GenerationRequestSnapshot } from '../../../domain/generationTask';

export interface DetailDataRow {
  id: string;
  label: string;
  value: string | number | boolean | null | undefined;
}

export interface DetailTechnicalBlock {
  id: string;
  title: string;
  value: unknown;
  defaultOpen?: boolean;
}

export interface DetailDescriptorContext {
  snapshot: GenerationRequestSnapshot;
  raw?: unknown;
  activeImage?: GeneratedImage | null;
  t: (key: string, vars?: Record<string, string | number | boolean | null | undefined>) => string;
}

export interface ProviderDetailDescriptor {
  id: string;
  kind: 'request-snapshot' | 'provider-owned' | (string & {});
  order?: number;
  parameterTitleKey: string;
  parameterKickerKey: string;
  metadataTitleKey: string;
  metadataKickerKey: string;
  runtimeTitleKey?: string;
  runtimeKickerKey?: string;
  matches?: (snapshot: GenerationRequestSnapshot) => boolean;
  getParameterRows(context: DetailDescriptorContext): DetailDataRow[];
  getMetadataRows(context: DetailDescriptorContext): DetailDataRow[];
  getRuntimeRows?(context: DetailDescriptorContext): DetailDataRow[];
  getTechnicalBlocks(context: DetailDescriptorContext): DetailTechnicalBlock[];
}

export function createDetailDescriptorContext(args: {
  snapshot: GenerationRequestSnapshot;
  raw?: unknown;
  activeImage?: GeneratedImage | null;
  t: DetailDescriptorContext['t'];
}): DetailDescriptorContext {
  return args;
}
