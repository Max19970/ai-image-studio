import type { ProviderSettings } from '../../domain/providerSettings';
import { getProviderAdapterForSettings } from '../provider/registry';
import { providerGenerationSurfaceFallbackModules } from './surfaceRegistry.fallback';
import type { ProviderGenerationSurface } from './surfaceTypes';

type ProviderGenerationSurfaceModule = Record<string, unknown>;
type ImportMetaWithGlob = ImportMeta & {
  glob?: (pattern: string, options: { eager: true }) => Record<string, ProviderGenerationSurfaceModule>;
};

export type ProviderGenerationSurfaceFallbackReason = 'missing-surface' | 'unknown-surface';

export interface ProviderGenerationSurfaceFallbackPolicy {
  resolveSurface(context: {
    surfaceId: string | null | undefined;
    reason: ProviderGenerationSurfaceFallbackReason;
    surfacesById: ReadonlyMap<string, ProviderGenerationSurface>;
  }): ProviderGenerationSurface;
}

export const defaultProviderGenerationSurfaceId = 'openai-compatible.logical-params';

const discoveredProviderGenerationSurfaceModules = (import.meta as ImportMetaWithGlob).glob?.('../../providers/*/generationSurface.ts', { eager: true }) ?? {};
const providerGenerationSurfaceModules = {
  ...providerGenerationSurfaceFallbackModules,
  ...discoveredProviderGenerationSurfaceModules
} as Record<string, ProviderGenerationSurfaceModule>;

function isProviderGenerationSurface(value: unknown): value is ProviderGenerationSurface {
  const candidate = value as Partial<ProviderGenerationSurface> | null;
  return Boolean(
    candidate?.id &&
    candidate.kind &&
    typeof candidate.getDefaultState === 'function' &&
    typeof candidate.renderSlot === 'function' &&
    typeof candidate.buildPayload === 'function'
  );
}

function collectProviderGenerationSurfaces(modules: Record<string, ProviderGenerationSurfaceModule>): ProviderGenerationSurface[] {
  return Object.entries(modules)
    .flatMap(([sourcePath, module]) =>
      Object.values(module)
        .filter(isProviderGenerationSurface)
        .map((surface) => ({ surface, sourcePath }))
    )
    .sort((a, b) => a.surface.id.localeCompare(b.surface.id) || a.sourcePath.localeCompare(b.sourcePath))
    .map(({ surface }) => surface);
}

export const providerGenerationSurfaces = collectProviderGenerationSurfaces(providerGenerationSurfaceModules);
export const providerGenerationSurfacesById = new Map(providerGenerationSurfaces.map((surface) => [surface.id, surface]));

const defaultProviderGenerationSurfaceFallbackPolicy: ProviderGenerationSurfaceFallbackPolicy = {
  resolveSurface: ({ surfaceId, reason, surfacesById }) => {
    const fallback = surfacesById.get(defaultProviderGenerationSurfaceId) ?? providerGenerationSurfaces[0];
    if (!fallback) throw new Error('[generation-surface] No provider generation surfaces are registered.');
    if (surfaceId && reason === 'unknown-surface') {
      console.warn(`[generation-surface] Unknown surface "${surfaceId}". Falling back to "${fallback.id}".`);
    }
    return fallback;
  }
};

let providerGenerationSurfaceFallbackPolicy = defaultProviderGenerationSurfaceFallbackPolicy;

export function setProviderGenerationSurfaceFallbackPolicy(policy: ProviderGenerationSurfaceFallbackPolicy): void {
  providerGenerationSurfaceFallbackPolicy = policy;
}

export function getProviderGenerationSurfaceById(surfaceId: string | null | undefined): ProviderGenerationSurface {
  if (surfaceId && providerGenerationSurfacesById.has(surfaceId)) return providerGenerationSurfacesById.get(surfaceId)!;
  return providerGenerationSurfaceFallbackPolicy.resolveSurface({
    surfaceId,
    reason: surfaceId ? 'unknown-surface' : 'missing-surface',
    surfacesById: providerGenerationSurfacesById
  });
}

export function getProviderGenerationSurface(provider: Pick<ProviderSettings, 'adapterId'> | null | undefined): ProviderGenerationSurface {
  const definition = getProviderAdapterForSettings(provider as ProviderSettings | null | undefined).generationSurface;
  return getProviderGenerationSurfaceById(definition.id);
}
