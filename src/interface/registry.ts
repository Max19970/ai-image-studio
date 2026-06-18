import { isFeatureEnabled } from '../shared/features';
import { resolvedPlacementContributions } from './registry/resolvePlacements';
import type { ResolvedSlotContribution } from './slots/types';

const normalizedContributions = resolvedPlacementContributions.filter((item) => isFeatureEnabled(item.requiresFeature));

if (import.meta.env.DEV) {
  const seen = new Map<string, ResolvedSlotContribution>();
  for (const contribution of normalizedContributions) {
    const key = `${contribution.slot}:${contribution.id}`;
    const previous = seen.get(key);
    if (previous) {
      console.warn(`[slots] Duplicate contribution id "${key}" from ${previous.sourcePath} and ${contribution.sourcePath}`);
    }
    seen.set(key, contribution);
    if (!contribution.id || contribution.order === undefined || contribution.order === null) {
      console.warn(`[slots] Contribution ${contribution.sourcePath} should define a stable id and order.`);
    }
  }
}

export const slotContributions = normalizedContributions
  .sort((a, b) => a.slot.localeCompare(b.slot) || a.order - b.order || a.id.localeCompare(b.id));

export function getSlotContributions<TContext = unknown>(slot: string): ResolvedSlotContribution<TContext>[] {
  return slotContributions.filter((item) => item.slot === slot) as ResolvedSlotContribution<TContext>[];
}
