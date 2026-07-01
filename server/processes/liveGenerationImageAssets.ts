export interface LiveGenerationImageAsset {
  id: string;
  mimeType: string;
  bytes: Buffer;
  createdAt: number;
  expiresAt: number;
}

export interface ParsedImageDataUrl {
  mimeType: string;
  bytes: Buffer;
}

export interface LiveGenerationImageStoreOptions {
  ttlMs?: number;
  maxItems?: number;
  idFactory?: () => string;
  now?: () => number;
  urlFor?: (asset: LiveGenerationImageAsset) => string;
}

export interface LiveGenerationImageStore {
  registerSource(sourceId: string, src: string): LiveGenerationImageAsset | null;
  getAsset(id: string): LiveGenerationImageAsset | null;
  urlFor(asset: LiveGenerationImageAsset): string;
  reset(): void;
}

export const defaultLiveImageTtlMs = 10 * 60_000;
export const defaultLiveImageMaxItems = 160;

export function parseImageDataUrl(src: string): ParsedImageDataUrl | null {
  const match = /^data:([^;,]+);base64,(.*)$/s.exec(src);
  if (!match) return null;
  try {
    return {
      mimeType: match[1] || 'image/png',
      bytes: Buffer.from(match[2], 'base64')
    };
  } catch {
    return null;
  }
}

export function defaultLiveImageUrl(asset: LiveGenerationImageAsset): string {
  return `/api/generation-tasks/live-images/${encodeURIComponent(asset.id)}`;
}

export function createLiveGenerationImageStore(options: LiveGenerationImageStoreOptions = {}): LiveGenerationImageStore {
  const ttlMs = options.ttlMs ?? defaultLiveImageTtlMs;
  const maxItems = options.maxItems ?? defaultLiveImageMaxItems;
  const idFactory = options.idFactory ?? (() => crypto.randomUUID());
  const now = options.now ?? (() => Date.now());
  const urlFor = options.urlFor ?? defaultLiveImageUrl;
  const assets = new Map<string, LiveGenerationImageAsset>();
  const idsBySource = new Map<string, string>();

  function cleanup(at = now()) {
    for (const [id, asset] of assets) {
      if (asset.expiresAt <= at) assets.delete(id);
    }

    while (assets.size > maxItems) {
      const oldest = [...assets.values()].sort((a, b) => a.createdAt - b.createdAt)[0];
      if (!oldest) break;
      assets.delete(oldest.id);
    }

    const activeIds = new Set(assets.keys());
    for (const [sourceId, liveId] of idsBySource) {
      if (!activeIds.has(liveId)) idsBySource.delete(sourceId);
    }
  }

  return {
    registerSource(sourceId, src) {
      const parsed = parseImageDataUrl(src);
      if (!parsed) return null;

      const createdAt = now();
      cleanup(createdAt);

      const id = idsBySource.get(sourceId) ?? idFactory();
      idsBySource.set(sourceId, id);
      const asset: LiveGenerationImageAsset = {
        id,
        mimeType: parsed.mimeType,
        bytes: parsed.bytes,
        createdAt,
        expiresAt: createdAt + ttlMs
      };
      assets.set(id, asset);
      return asset;
    },
    getAsset(id) {
      cleanup();
      return assets.get(id) ?? null;
    },
    urlFor,
    reset() {
      assets.clear();
      idsBySource.clear();
    }
  };
}
