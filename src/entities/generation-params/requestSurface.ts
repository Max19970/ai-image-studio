import type { ProviderSettings } from '../../domain/providerSettings';
import { getProviderAdapterForSettings } from '../provider/registry';
import { buildOpenAiCompatibleRequestSurfacePayload } from './openAiCompatiblePayload';
import { providerGenerationRequestSurfaceFallbackModules } from './requestSurface.fallback';
import type {
  ProviderGenerationRequestSurface,
  ProviderGenerationRequestSurfacePayloadContext,
  ProviderGenerationRequestSurfaceRestoreContext,
  ProviderGenerationRequestSurfaceSnapshotContext
} from './requestSurfaceTypes';

export { buildOpenAiCompatibleRequestSurfacePayload } from './openAiCompatiblePayload';

export type {
  ProviderGenerationRequestSurface,
  ProviderGenerationRequestSurfacePayloadContext,
  ProviderGenerationRequestSurfaceRestoreContext,
  ProviderGenerationRequestSurfaceSnapshotContext
} from './requestSurfaceTypes';

type ProviderGenerationRequestSurfaceModule = Record<string, unknown>;
type ImportMetaWithGlob = ImportMeta & {
  glob?: (pattern: string, options: { eager: true }) => Record<string, ProviderGenerationRequestSurfaceModule>;
};

export type ProviderGenerationRequestSurfaceFallbackReason = 'missing-surface' | 'unknown-surface';

export interface ProviderGenerationRequestSurfaceFallbackPolicy {
  resolveSurface(context: {
    surfaceId: string | null | undefined;
    reason: ProviderGenerationRequestSurfaceFallbackReason;
    surfacesById: ReadonlyMap<string, ProviderGenerationRequestSurface>;
  }): ProviderGenerationRequestSurface;
}

export const defaultProviderGenerationRequestSurfaceId = 'openai-compatible.logical-params';

const discoveredProviderGenerationRequestSurfaceModules = (import.meta as ImportMetaWithGlob).glob?.('../../providers/*/generationRequestSurface.ts', { eager: true }) ?? {};
const providerGenerationRequestSurfaceModules = {
  ...providerGenerationRequestSurfaceFallbackModules,
  ...discoveredProviderGenerationRequestSurfaceModules
} as Record<string, ProviderGenerationRequestSurfaceModule>;

function isProviderGenerationRequestSurface(value: unknown): value is ProviderGenerationRequestSurface {
  const candidate = value as Partial<ProviderGenerationRequestSurface> | null;
  return Boolean(candidate?.id && candidate.kind && typeof candidate.buildPayload === 'function' && typeof candidate.restoreParamsFromSnapshot === 'function');
}

function collectProviderGenerationRequestSurfaces(modules: Record<string, ProviderGenerationRequestSurfaceModule>): ProviderGenerationRequestSurface[] {
  return Object.entries(modules)
    .flatMap(([sourcePath, module]) =>
      Object.values(module)
        .filter(isProviderGenerationRequestSurface)
        .map((surface) => ({ surface, sourcePath }))
    )
    .sort((a, b) => a.surface.id.localeCompare(b.surface.id) || a.sourcePath.localeCompare(b.sourcePath))
    .map(({ surface }) => surface);
}

export const providerGenerationRequestSurfaces = collectProviderGenerationRequestSurfaces(providerGenerationRequestSurfaceModules);
export const providerGenerationRequestSurfacesById = new Map(providerGenerationRequestSurfaces.map((surface) => [surface.id, surface]));

const defaultProviderGenerationRequestSurfaceFallbackPolicy: ProviderGenerationRequestSurfaceFallbackPolicy = {
  resolveSurface: ({ surfaceId, reason, surfacesById }) => {
    const fallback = surfacesById.get(defaultProviderGenerationRequestSurfaceId) ?? providerGenerationRequestSurfaces[0];
    if (!fallback) throw new Error('[generation-request-surface] No provider request surfaces are registered.');
    if (surfaceId && reason === 'unknown-surface') {
      console.warn(`[generation-request-surface] Unknown surface "${surfaceId}". Falling back to "${fallback.id}".`);
    }
    return fallback;
  }
};

let providerGenerationRequestSurfaceFallbackPolicy = defaultProviderGenerationRequestSurfaceFallbackPolicy;

export function setProviderGenerationRequestSurfaceFallbackPolicy(policy: ProviderGenerationRequestSurfaceFallbackPolicy): void {
  providerGenerationRequestSurfaceFallbackPolicy = policy;
}

export function getProviderGenerationRequestSurfaceById(surfaceId: string | null | undefined): ProviderGenerationRequestSurface {
  if (surfaceId && providerGenerationRequestSurfacesById.has(surfaceId)) return providerGenerationRequestSurfacesById.get(surfaceId)!;
  return providerGenerationRequestSurfaceFallbackPolicy.resolveSurface({
    surfaceId,
    reason: surfaceId ? 'unknown-surface' : 'missing-surface',
    surfacesById: providerGenerationRequestSurfacesById
  });
}

export function getProviderGenerationRequestSurface(provider: Pick<ProviderSettings, 'adapterId'> | null | undefined): ProviderGenerationRequestSurface {
  const surfaceId = getProviderAdapterForSettings(provider).generationSurface.id;
  return getProviderGenerationRequestSurfaceById(surfaceId);
}

void buildOpenAiCompatibleRequestSurfacePayload;
