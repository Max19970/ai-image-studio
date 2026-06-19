# Focus/performance stage 03 report — bounded thumbnail cache

Date: 2026-06-19
Stage: 3 — Thumbnail cache: bounded LRU and controlled canvas work
Status: Done

## Summary

Stage 3 replaced the unbounded optimized thumbnail cache with a small bounded LRU cache and added lightweight controls around expensive browser image/canvas work. The public thumbnail optimization API stayed centralized in `src/shared/image/imageOptimization.ts`; no storage v2 or gallery archive contracts were rewritten.

## Changed files

- `src/shared/image/imageOptimization.ts`
  - replaced module-level unbounded `Map` with `BoundedThumbnailCache`;
  - bounded retained cache by entry count and stored data URL chars;
  - added in-flight work deduplication per cache key;
  - added a small concurrency limiter for uncached image/canvas optimization work;
  - kept first render non-blocking: `useOptimizedImageSrc()` still returns the original src until an optimized source is ready;
  - added `skipOptimization` option for call sites that already have a persisted thumbnail.

- `src/features/gallery/sections/card-result/GalleryResultCardSection.tsx`
  - skips extra canvas optimization when `activeImage.thumbnailSrc` already exists.

- `src/features/detail/sections/hero/DetailThumb.tsx`
  - skips extra canvas optimization when `item.thumbnailSrc` already exists.

- `tests/thumbnail-cache.test.ts`
  - covers LRU eviction;
  - covers retained data URL char-budget eviction;
  - covers skip behavior;
  - covers concurrent in-flight deduplication.

## Debt gate result

Passed.

- No worker/pipeline complexity was introduced.
- No storage schema or persistence behavior changed.
- Components only declare whether an already persisted thumbnail is present; cache policy remains in `shared/image`.
- First paint remains immediate because the hook still falls back to the provided source.
- Detail carousel DOM-windowing was intentionally left for stage 4.

## Verification

Commands run:

- `npm test` — 51/51 passed.
- `npm run build` — passed; existing Vite chunk warning remains.
- `npm run verify:static` — passed.
- `npm run capture:screenshots -- --viewports=desktop,mobile --scenarios=gallery,detail,batch-composer --out=artifacts/stage-03-visual-final` — 6/6 captured.
- `node scripts/check-screenshot-artifacts.mjs --dir=artifacts/stage-03-visual-final --viewports=desktop,mobile --scenarios=gallery,detail,batch-composer` — passed.

Visual scenarios checked:

- desktop gallery;
- desktop detail;
- desktop batch composer;
- mobile gallery;
- mobile detail;
- mobile batch composer.

## Manual/visual notes

The screenshots show no visible regression in gallery thumbnails, detail hero, detail side panel, or batch composer layout. The screenshot runner uses fixture data, so real API generation was not triggered.

## Remaining work

Stage 4 should handle detail carousel DOM-windowing. Stage 3 deliberately did not reduce the number of mounted hidden carousel slides.
