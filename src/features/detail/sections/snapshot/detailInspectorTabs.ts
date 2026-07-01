import { detailInspectorTabFallbackModules } from './detailInspectorTabs.generated';
import type { DetailInspectorTab, DetailInspectorTabDescriptor } from './detailInspectorTabTypes';

export type { DetailInspectorTab, DetailInspectorTabDescriptor } from './detailInspectorTabTypes';

function isDetailInspectorTabDescriptor(value: unknown): value is DetailInspectorTabDescriptor {
  const candidate = value as Partial<DetailInspectorTabDescriptor> | null;
  return Boolean(candidate?.id && typeof candidate.order === 'number');
}

export const detailInspectorTabDescriptors = Object.values(detailInspectorTabFallbackModules)
  .flatMap((module) => Object.values(module).filter(isDetailInspectorTabDescriptor))
  .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

export const detailInspectorTabs = detailInspectorTabDescriptors.map((descriptor) => descriptor.id as DetailInspectorTab);

export function visible(activeMobileTab: DetailInspectorTab | undefined, tab: DetailInspectorTab) {
  return !activeMobileTab || activeMobileTab === tab;
}
