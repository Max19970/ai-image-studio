import type { GenerationRequestSnapshot } from '../../../domain/generationTask';
import { providerDetailDescriptorFallbackModules } from './detailDescriptors.generated';
import {
  createDetailDescriptorContext,
  type DetailDataRow,
  type DetailDescriptorContext,
  type DetailTechnicalBlock,
  type ProviderDetailDescriptor
} from './detailDescriptorTypes';

export type { DetailDataRow, DetailDescriptorContext, DetailTechnicalBlock, ProviderDetailDescriptor } from './detailDescriptorTypes';
export { createDetailDescriptorContext } from './detailDescriptorTypes';

type ProviderDetailDescriptorModule = Record<string, unknown>;
type ImportMetaWithGlob = ImportMeta & {
  glob?: (pattern: string, options: { eager: true }) => Record<string, ProviderDetailDescriptorModule>;
};

const discoveredProviderDetailDescriptorModules = (import.meta as ImportMetaWithGlob).glob?.('./descriptors/*DetailDescriptor.ts', { eager: true }) ?? {};
const providerDetailDescriptorModules = {
  ...providerDetailDescriptorFallbackModules,
  ...discoveredProviderDetailDescriptorModules
} as Record<string, ProviderDetailDescriptorModule>;

function isProviderDetailDescriptor(value: unknown): value is ProviderDetailDescriptor {
  const candidate = value as Partial<ProviderDetailDescriptor> | null;
  return Boolean(
    candidate?.id &&
    candidate.kind &&
    candidate.parameterTitleKey &&
    candidate.parameterKickerKey &&
    candidate.metadataTitleKey &&
    candidate.metadataKickerKey &&
    typeof candidate.getParameterRows === 'function' &&
    typeof candidate.getMetadataRows === 'function' &&
    typeof candidate.getTechnicalBlocks === 'function'
  );
}

function collectProviderDetailDescriptors(): ProviderDetailDescriptor[] {
  const byId = new Map<string, { descriptor: ProviderDetailDescriptor; sourcePath: string }>();
  for (const [sourcePath, module] of Object.entries(providerDetailDescriptorModules)) {
    for (const descriptor of Object.values(module).filter(isProviderDetailDescriptor)) {
      byId.set(descriptor.id, { descriptor, sourcePath });
    }
  }
  return [...byId.values()]
    .sort((a, b) => (a.descriptor.order ?? 1000) - (b.descriptor.order ?? 1000) || a.descriptor.id.localeCompare(b.descriptor.id) || a.sourcePath.localeCompare(b.sourcePath))
    .map(({ descriptor }) => descriptor);
}

export const providerDetailDescriptors = collectProviderDetailDescriptors();
export const providerDetailDescriptorsById = new Map(providerDetailDescriptors.map((descriptor) => [descriptor.id, descriptor]));

const defaultProviderDetailDescriptor = providerDetailDescriptors.find((descriptor) => descriptor.kind === 'request-snapshot') ?? providerDetailDescriptors[0];

export function getProviderDetailDescriptor(snapshot: GenerationRequestSnapshot): ProviderDetailDescriptor {
  const matched = providerDetailDescriptors.find((descriptor) => descriptor.matches?.(snapshot));
  if (matched) return matched;
  if (!defaultProviderDetailDescriptor) throw new Error('[detail-descriptors] No provider detail descriptors are registered.');
  return defaultProviderDetailDescriptor;
}

void createDetailDescriptorContext;
void (null as DetailDataRow | null);
void (null as DetailDescriptorContext | null);
void (null as DetailTechnicalBlock | null);
