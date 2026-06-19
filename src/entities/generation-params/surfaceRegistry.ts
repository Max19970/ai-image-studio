import type { ProviderSettings } from '../../domain/providerSettings';
import { getProviderAdapterForSettings } from '../provider/registry';
import { openAiCompatibleGenerationSurface } from './openAiCompatibleSurface';
import { comfyUiGenerationSurface } from './comfyui';
import type { ProviderGenerationSurface } from './surfaceTypes';

export const providerGenerationSurfaces = [openAiCompatibleGenerationSurface, comfyUiGenerationSurface] satisfies ProviderGenerationSurface[];
export const providerGenerationSurfacesById = new Map(providerGenerationSurfaces.map((surface) => [surface.id, surface]));

export function getProviderGenerationSurfaceById(surfaceId: string | null | undefined): ProviderGenerationSurface {
  if (!surfaceId) return openAiCompatibleGenerationSurface;
  return providerGenerationSurfacesById.get(surfaceId) ?? openAiCompatibleGenerationSurface;
}

export function getProviderGenerationSurface(provider: Pick<ProviderSettings, 'adapterId'> | null | undefined): ProviderGenerationSurface {
  const definition = getProviderAdapterForSettings(provider as ProviderSettings | null | undefined).generationSurface;
  return getProviderGenerationSurfaceById(definition.id);
}
