# Focus/performance stage 04 report — detail carousel DOM window

Date: 2026-06-19
Stage: 4 — Detail carousel and large image scenes
Status: Done

## Summary

Stage 4 changed the detail result carousel from full logical slide rendering to a small DOM window. The carousel still keeps the full logical `slides` array for navigation, selected-image sync and the `activeIndex + 1 / slides.length` counter, but it only mounts the visible scene slides: active, previous and next.

For a large batch/multi-image detail page this avoids mounting dozens of hidden carousel `<img>` nodes and avoids triggering `useOptimizedImageSrc(..., 1200)` for off-window images. The lower output thumbnail strip was intentionally left unchanged because it is visible navigation UI and already uses smaller lazy thumbnails.

## Changed files

- `src/features/detail/sections/carousel/carouselWindow.ts`
  - added feature-local pure helper `getVisibleCarouselSlides(slides, activeIndex)`;
  - keeps original logical indexes;
  - deduplicates the two-slide prev/next collision by preserving existing two-slide visual behavior: active + prev.

- `src/features/detail/sections/carousel/DetailResultCarousel.tsx`
  - renders `visibleSlides` instead of `slides.map(...)`;
  - keeps `selectIndex`, `go`, `activeIndex`, `slides.length` and `onSelectImage` semantics based on the full logical list;
  - keeps existing active/prev/next CSS classes unchanged.

- `tests/detail-carousel-window.test.ts`
  - covers empty, single, two-slide, large carousel and pending-adjacent window cases.

## Debt gate result

Passed.

- No generic virtualizer was added.
- No global state, storage, provider, batch-runner or SlotHost contracts changed.
- The optimization is feature-local and covered by pure unit tests.
- Existing carousel classes and visual transforms are reused as-is.

## Verification

Commands run:

- `npm test` — 56/56 passed.
- `npm run build` — passed; existing Vite chunk warning remains.
- `npm run verify:static` — passed.
- `npm run capture:screenshots -- --viewports=desktop,mobile --scenarios=detail --out=artifacts/stage-04-visual` — 2/2 captured.
- `node scripts/check-screenshot-artifacts.mjs --dir=artifacts/stage-04-visual --viewports=desktop,mobile --scenarios=detail` — passed.

Additional ad-hoc browser check:

- Seeded a 12-image detail carousel fixture.
- Before navigation: carousel viewport mounted 3 slide buttons and 3 carousel images.
- After clicking next: carousel viewport still mounted 3 slide buttons and 3 carousel images.
- Screenshot saved to `artifacts/stage-04-carousel-window/desktop-detail-carousel-window.png`.

Visual scenarios checked:

- desktop detail fixture;
- mobile detail fixture;
- desktop 12-image carousel fixture.

## Manual/visual notes

The standard detail fixture is a single-image detail page and looked unchanged on desktop/mobile. The ad-hoc 12-image carousel showed the active/prev/next 3D layout, nav buttons, output strip and counter visually working after the DOM-window change.

Pending slide behavior was covered by unit test in `detail-carousel-window.test.ts`. A separate pending browser screenshot was not kept because the current screenshot fixture path did not open the intended pending carousel state reliably without adding a permanent test scenario.

## Remaining work

Stage 5 can now focus on render churn around composer/batch context. Stage 4 deliberately did not virtualize the output thumbnail strip or change detail request drawers.
