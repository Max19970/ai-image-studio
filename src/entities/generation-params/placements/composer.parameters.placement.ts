import type { GenerationParamFieldPlacement } from '../types';

/**
 * Legacy placement registry kept as a compatibility extension point.
 * Built-in fields now own placements in their own field folders.
 */
export const placements: GenerationParamFieldPlacement[] = [];
