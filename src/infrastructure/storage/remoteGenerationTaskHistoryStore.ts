import type { GeneratedImage } from '../../domain/generationTask';
import { fetchProxy, readJsonOrThrow } from '../api/common';

export const generationTaskAssetEndpoint = '/api/storage/generation-task-asset';

export async function loadGenerationTaskAsset(key: string): Promise<GeneratedImage | null> {
  const response = await fetchProxy(`${generationTaskAssetEndpoint}?key=${encodeURIComponent(key)}`);
  if (response.status === 404) return null;
  const data = await readJsonOrThrow(response) as { image?: GeneratedImage | null } | null;
  return data?.image ?? null;
}
