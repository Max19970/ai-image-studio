import type { ComfyUiResourceCacheEntry } from '../../../../../domain/comfyUiSettings';

export function cacheAge(cache: ComfyUiResourceCacheEntry | null, fallback: string) {
  if (!cache) return fallback;
  return new Date(cache.createdAt).toLocaleString();
}

export function resourceOptions(cache: ComfyUiResourceCacheEntry | null, current = '') {
  const values = new Map<string, { value: string; label: string; description?: string }>();
  if (current.trim()) values.set(current, { value: current, label: current, description: 'manual value' });
  cache?.items.forEach((item) => {
    values.set(item.name, {
      value: item.name,
      label: item.name,
      description: item.nativeName && item.nativeName !== item.name ? item.nativeName : item.description
    });
  });
  return [...values.values()];
}
