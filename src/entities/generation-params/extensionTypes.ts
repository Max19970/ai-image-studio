import type { ReactNode } from 'react';
import type { ProviderRequestParameterSummaryEntry } from '../../domain/generationTask';
import type { GenerationParamSlot, GenerationParamTab, GenerationParamTabDefinition } from './types';
import type {
  ProviderGenerationSurfaceContext,
  ProviderGenerationSurfaceHiddenSummary,
  ProviderGenerationSurfacePatchContext,
  ProviderGenerationSurfacePayloadContext,
  ProviderGenerationSurfaceSnapshotContext
} from './surfaceTypes';

export type ProviderGenerationExtensionContext =
  | ProviderGenerationSurfaceContext
  | ProviderGenerationSurfacePayloadContext
  | ProviderGenerationSurfaceSnapshotContext;

export interface ProviderGenerationExtension {
  id: string;
  order: number;
  isEnabled?: (context: ProviderGenerationExtensionContext) => boolean;
  getTabs?: (context: ProviderGenerationSurfaceContext) => readonly GenerationParamTabDefinition[];
  getTabStats?: (context: ProviderGenerationSurfaceContext) => Partial<Record<GenerationParamTab, string>>;
  getHiddenSummary?: (context: ProviderGenerationSurfacePatchContext) => Partial<ProviderGenerationSurfaceHiddenSummary>;
  renderSlot?: (slot: GenerationParamSlot, context: ProviderGenerationSurfacePatchContext) => ReactNode[];
  buildPayload?: (context: ProviderGenerationSurfacePayloadContext) => Record<string, unknown>;
  captureParameterSummaryEntries?: (context: ProviderGenerationSurfaceSnapshotContext) => ProviderRequestParameterSummaryEntry[];
}

export function getEnabledGenerationExtensions(
  extensions: readonly ProviderGenerationExtension[],
  context: ProviderGenerationExtensionContext
): ProviderGenerationExtension[] {
  return extensions
    .filter((extension) => extension.isEnabled?.(context) ?? true)
    .slice()
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
}

export function mergeGenerationTabs(
  baseTabs: readonly GenerationParamTabDefinition[],
  extensions: readonly ProviderGenerationExtension[],
  context: ProviderGenerationSurfaceContext
): GenerationParamTabDefinition[] {
  const tabs = [...baseTabs];
  for (const extension of getEnabledGenerationExtensions(extensions, context)) {
    for (const tab of extension.getTabs?.(context) ?? []) {
      const existingIndex = tabs.findIndex((item) => item.id === tab.id);
      if (existingIndex >= 0) tabs[existingIndex] = { ...tabs[existingIndex], ...tab };
      else tabs.push(tab);
    }
  }
  return tabs;
}

export function mergeGenerationTabStats(
  baseStats: Record<GenerationParamTab, string>,
  extensions: readonly ProviderGenerationExtension[],
  context: ProviderGenerationSurfaceContext
): Record<GenerationParamTab, string> {
  const stats: Record<string, string> = { ...baseStats };
  for (const extension of getEnabledGenerationExtensions(extensions, context)) {
    const nextStats = extension.getTabStats?.(context) ?? {};
    for (const [tab, value] of Object.entries(nextStats)) {
      if (typeof value === 'string') stats[tab] = value;
    }
  }
  return stats as Record<GenerationParamTab, string>;
}

export function mergeGenerationHiddenSummary(
  baseSummary: ProviderGenerationSurfaceHiddenSummary,
  extensions: readonly ProviderGenerationExtension[],
  context: ProviderGenerationSurfacePatchContext
): ProviderGenerationSurfaceHiddenSummary {
  const summary: ProviderGenerationSurfaceHiddenSummary = {
    capabilityKeys: [...baseSummary.capabilityKeys],
    paramLabelKeys: [...baseSummary.paramLabelKeys]
  };
  for (const extension of getEnabledGenerationExtensions(extensions, context)) {
    const next = extension.getHiddenSummary?.(context);
    if (!next) continue;
    summary.capabilityKeys = [...summary.capabilityKeys, ...(next.capabilityKeys ?? [])];
    summary.paramLabelKeys = [...summary.paramLabelKeys, ...(next.paramLabelKeys ?? [])];
  }
  return summary;
}

export function renderGenerationExtensionSlot(
  slot: GenerationParamSlot,
  extensions: readonly ProviderGenerationExtension[],
  context: ProviderGenerationSurfacePatchContext
): ReactNode[] {
  return getEnabledGenerationExtensions(extensions, context).flatMap((extension) => extension.renderSlot?.(slot, context) ?? []);
}

export function buildGenerationExtensionPayload(
  extensions: readonly ProviderGenerationExtension[],
  context: ProviderGenerationSurfacePayloadContext
): Record<string, unknown> {
  return getEnabledGenerationExtensions(extensions, context).reduce(
    (payload, extension) => ({ ...payload, ...(extension.buildPayload?.(context) ?? {}) }),
    {}
  );
}

export function captureGenerationExtensionSummaryEntries(
  extensions: readonly ProviderGenerationExtension[],
  context: ProviderGenerationSurfaceSnapshotContext
): ProviderRequestParameterSummaryEntry[] {
  return getEnabledGenerationExtensions(extensions, context).flatMap((extension) => extension.captureParameterSummaryEntries?.(context) ?? []);
}
