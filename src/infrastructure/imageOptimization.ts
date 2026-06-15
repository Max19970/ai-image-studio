import { useEffect, useState } from 'react';

const thumbnailCache = new Map<string, string | null>();

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

export async function createOptimizedThumbnail(src: string, maxEdge = 520, quality = 0.84): Promise<string | null> {
  const cacheKey = `${maxEdge}:${quality}:${src.slice(0, 120)}:${src.length}`;
  if (thumbnailCache.has(cacheKey)) return thumbnailCache.get(cacheKey) ?? null;

  try {
    const img = await loadImage(src);
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (!width || !height || Math.max(width, height) <= maxEdge) {
      thumbnailCache.set(cacheKey, null);
      return null;
    }

    const scale = maxEdge / Math.max(width, height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) throw new Error('Canvas is unavailable.');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const optimized = await canvasToDataUrl(canvas, 'image/webp', quality);
    thumbnailCache.set(cacheKey, optimized);
    return optimized;
  } catch {
    thumbnailCache.set(cacheKey, null);
    return null;
  }
}

export function useOptimizedImageSrc(src: string | undefined, maxEdge: number) {
  const [optimized, setOptimized] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setOptimized(null);
    if (!src) return;

    void createOptimizedThumbnail(src, maxEdge).then((value) => {
      if (alive) setOptimized(value);
    });

    return () => {
      alive = false;
    };
  }, [src, maxEdge]);

  return optimized ?? src;
}
