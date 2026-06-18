import { isFeatureEnabled } from '../../shared/features';
import type { ElementPlacement } from './types';

const placementModules = import.meta.glob('../placements/**/*.placement.ts', { eager: true }) as Record<string, unknown>;

type PlacementModule = {
  default?: ElementPlacement | ElementPlacement[];
  placements?: ElementPlacement[];
  placement?: ElementPlacement;
};

function toPlacements(rawModule: unknown): ElementPlacement[] {
  const module = rawModule as PlacementModule;
  const exported = module.placements ?? module.placement ?? module.default;
  if (!exported) return [];
  return Array.isArray(exported) ? exported : [exported];
}

export const elementPlacements = Object.entries(placementModules)
  .flatMap(([sourcePath, module]) => toPlacements(module).map((placement) => ({ ...placement, sourcePath })))
  .filter((placement) => isFeatureEnabled(placement.requiresFeature));

if (import.meta.env.DEV) {
  const seen = new Map<string, string>();
  for (const placement of elementPlacements) {
    const previous = seen.get(placement.id);
    if (previous) {
      console.warn(`[placements] Duplicate placement id "${placement.id}" from ${previous} and ${placement.sourcePath}`);
    }
    seen.set(placement.id, placement.sourcePath);
    if (!placement.id || !placement.slot || !placement.use || placement.order === undefined || placement.order === null) {
      console.warn(`[placements] Placement ${placement.sourcePath} should define stable id, slot, use and order.`);
    }
  }
}
