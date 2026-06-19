import { useEffect, useState } from 'react';

const DEFAULT_THUMBNAIL_CACHE_MAX_ENTRIES = 120;
const DEFAULT_THUMBNAIL_CACHE_MAX_CHARS = 8_000_000;
const MAX_THUMBNAIL_WORKERS = 2;

type CacheValue = string | null;

interface BoundedThumbnailCacheOptions {
  maxEntries: number;
  maxValueChars: number;
}

interface OptimizedImageOptions {
  quality?: number;
  skipOptimization?: boolean;
}

class BoundedThumbnailCache {
  private readonly values = new Map<string, CacheValue>();
  private totalValueChars = 0;

  constructor(private readonly options: BoundedThumbnailCacheOptions) {}

  has(key: string) {
    return this.values.has(key);
  }

  get(key: string): CacheValue | undefined {
    if (!this.values.has(key)) return undefined;
    const value = this.values.get(key) ?? null;
    this.values.delete(key);
    this.values.set(key, value);
    return value;
  }

  set(key: string, value: CacheValue) {
    const previous = this.values.get(key);
    if (typeof previous === 'string') this.totalValueChars -= previous.length;
    if (this.values.has(key)) this.values.delete(key);

    this.values.set(key, value);
    if (typeof value === 'string') this.totalValueChars += value.length;
    this.evictOverflow();
  }

  clear() {
    this.values.clear();
    this.totalValueChars = 0;
  }

  snapshot() {
    return {
      entries: this.values.size,
      valueChars: this.totalValueChars,
      keys: [...this.values.keys()]
    };
  }

  private evictOverflow() {
    while (this.values.size > this.options.maxEntries || this.totalValueChars > this.options.maxValueChars) {
      const first = this.values.entries().next();
      if (first.done) return;
      const [key, value] = first.value;
      this.values.delete(key);
      if (typeof value === 'string') this.totalValueChars -= value.length;
    }
  }
}

const thumbnailCache = new BoundedThumbnailCache({
  maxEntries: DEFAULT_THUMBNAIL_CACHE_MAX_ENTRIES,
  maxValueChars: DEFAULT_THUMBNAIL_CACHE_MAX_CHARS
});
const pendingThumbnailWork = new Map<string, Promise<string | null>>();

let activeThumbnailWorkers = 0;
const thumbnailWorkQueue: Array<() => void> = [];

function runNextThumbnailWork() {
  if (activeThumbnailWorkers >= MAX_THUMBNAIL_WORKERS) return;
  const next = thumbnailWorkQueue.shift();
  if (!next) return;
  next();
}

function scheduleThumbnailWork<T>(work: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const run = () => {
      activeThumbnailWorkers += 1;
      void work().then(resolve, reject).finally(() => {
        activeThumbnailWorkers = Math.max(0, activeThumbnailWorkers - 1);
        runNextThumbnailWork();
      });
    };

    thumbnailWorkQueue.push(run);
    runNextThumbnailWork();
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith('data:') && !src.startsWith('blob:')) img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image for thumbnail optimization.'));
    img.src = src;
  });
}

async function canvasToDataUrl(canvas: HTMLCanvasElement, type: string, quality: number): Promise<string> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  if (blob) {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error ?? new Error('Could not read optimized thumbnail.'));
      reader.readAsDataURL(blob);
    });
  }
  return canvas.toDataURL('image/jpeg', quality);
}

function thumbnailCacheKey(src: string, maxEdge: number, quality: number) {
  return `${maxEdge}:${quality}:${src.slice(0, 120)}:${src.length}`;
}

async function createOptimizedThumbnailUncached(src: string, maxEdge: number, quality: number): Promise<string | null> {
  const img = await loadImage(src);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  if (!width || !height || Math.max(width, height) <= maxEdge) return null;

  const scale = maxEdge / Math.max(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) throw new Error('Canvas is unavailable.');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return await canvasToDataUrl(canvas, 'image/webp', quality);
}

export async function createOptimizedThumbnail(src: string, maxEdge = 520, qualityOrOptions: number | OptimizedImageOptions = 0.84): Promise<string | null> {
  const options = typeof qualityOrOptions === 'number' ? { quality: qualityOrOptions } : qualityOrOptions;
  const quality = options.quality ?? 0.84;
  if (!src || options.skipOptimization) return null;

  const cacheKey = thumbnailCacheKey(src, maxEdge, quality);
  const cached = thumbnailCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const pending = pendingThumbnailWork.get(cacheKey);
  if (pending) return await pending;

  const work = scheduleThumbnailWork(() => createOptimizedThumbnailUncached(src, maxEdge, quality))
    .then((optimized) => {
      thumbnailCache.set(cacheKey, optimized);
      return optimized;
    })
    .catch(() => {
      thumbnailCache.set(cacheKey, null);
      return null;
    })
    .finally(() => {
      pendingThumbnailWork.delete(cacheKey);
    });

  pendingThumbnailWork.set(cacheKey, work);
  return await work;
}

export function useOptimizedImageSrc(src: string | undefined, maxEdge: number, options: OptimizedImageOptions = {}) {
  const [optimized, setOptimized] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setOptimized(null);
    if (!src || options.skipOptimization) return;

    void createOptimizedThumbnail(src, maxEdge, options).then((value) => {
      if (alive) setOptimized(value);
    });

    return () => {
      alive = false;
    };
  }, [src, maxEdge, options.quality, options.skipOptimization]);

  return optimized ?? src;
}

export function clearOptimizedThumbnailCacheForTests() {
  thumbnailCache.clear();
  pendingThumbnailWork.clear();
}


export function getOptimizedThumbnailCacheSnapshotForTests() {
  return thumbnailCache.snapshot();
}
