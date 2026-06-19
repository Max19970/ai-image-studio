# Focus/performance stage 03 preflight — bounded thumbnail cache

Date: 2026-06-19
Stage: 3 — Thumbnail cache: bounded LRU and controlled canvas work

## Baseline findings

### Current cache

`src/shared/image/imageOptimization.ts` currently owns a module-level `thumbnailCache` implemented as a plain `Map<string, string | null>`.

Current behavior:

- key: `${maxEdge}:${quality}:${src.slice(0, 120)}:${src.length}`;
- cache hit returns the optimized data URL or `null`;
- cache miss loads the image, optionally downsizes it on canvas, converts it to WebP data URL, and stores the result;
- failed or non-resized images are cached as `null`;
- no maximum entry count;
- no maximum retained data URL bytes/chars;
- no concurrency control for many simultaneous `useOptimizedImageSrc` calls.

### Call sites

- `GalleryResultCardSection` uses `activeImage.thumbnailSrc ?? activeImage.src` with `maxEdge=620`.
- `DetailThumb` uses `item.thumbnailSrc ?? item.src` with `maxEdge=180`.
- `DetailResultCarousel` uses full `slide.image.src` with `maxEdge=1200`.
- `AttachmentImageStrip` uses attachment preview object URLs with `maxEdge=96/180`.
- storage sync uses `createOptimizedThumbnail(image.src, 520, 0.82)` before persistence when no `thumbnailSrc` exists.

### 100+ task simulation

For 100 gallery tasks with one active image each, a reload in thumbnail mode can already provide `thumbnailSrc` from storage v2. With the current hook, each card still asks `createOptimizedThumbnail()` to inspect the thumbnail source. Small thumbnails return `null`, but every distinct source still adds a permanent `null` cache entry.

For a large multi-result/detail task, carousel and thumb call sites can schedule multiple canvas jobs in one render pass. Stage 4 will reduce hidden DOM in the carousel; stage 3 should only prevent unbounded cache growth and smooth the work queue.

## Debt gate

### Risks rejected

- Do not introduce a worker pipeline in this stage. That would add architectural weight without clear need.
- Do not rewrite storage v2 or thumbnail persistence. Existing separated full/thumbnail asset behavior must remain stable.
- Do not block first paint on thumbnail generation. Hooks must continue returning the original source immediately and swap to optimized src only when ready.
- Do not make components responsible for cache eviction. Cache policy belongs to `shared/image`.

### Safe implementation shape

- Keep `createOptimizedThumbnail()` as the single public async optimizer.
- Replace the plain `Map` with a tiny bounded LRU in the same shared image layer.
- Bound by both entry count and retained string chars, so successful optimized data URLs cannot grow forever.
- Add a small concurrency limiter around actual image/canvas work.
- Let UI call sites skip optimization when they already have a persisted `thumbnailSrc`.
- Keep hook API backward-compatible for current simple calls.

## Planned implementation

1. Add a small bounded cache helper inside `imageOptimization.ts` or a nearby shared module.
2. Use `maxEntries` around 120 and a conservative char budget for retained optimized data URLs.
3. Add test-only diagnostics/clear helpers exported with explicit names.
4. Add `skipOptimization` support to `useOptimizedImageSrc`.
5. Update gallery/detail thumb call sites to skip optimization when `thumbnailSrc` is already present.
6. Add thumbnail cache tests for LRU eviction, char-budget eviction, and skip behavior.

## Acceptance checks

- `npm test`
- `npm run build`
- `npm run verify:static`
- targeted screenshots: `gallery`, `detail`, `batch-composer` on desktop/mobile
- screenshot artifact check for targeted scenarios

