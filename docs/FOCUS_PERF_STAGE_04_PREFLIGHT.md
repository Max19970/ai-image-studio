# Focus/performance stage 04 preflight — detail carousel DOM window

Date: 2026-06-19
Stage: 4 — Detail carousel and large image scenes
Status: Approved for implementation

## Current state

`src/features/detail/sections/carousel/DetailResultCarousel.tsx` builds one `slides` array from task images plus an optional pending slide. The renderer then maps every slide into a mounted `ResultCarouselSlide` button.

The CSS only makes three positions visible:

- active slide;
- previous slide;
- next slide.

Every other slide receives the hidden class. This preserves the visual carousel shape, but for large batch tasks it still mounts hidden slide buttons and hidden `<img>` nodes. Each mounted image also runs through `useOptimizedImageSrc(..., 1200)`, so large tasks can trigger unnecessary thumbnail work even when most slides are invisible.

## Simulated large-task behavior

For a batch task with 20–80 generated images:

- current DOM cost: 20–80 carousel slide buttons;
- current image cost: up to 20–80 carousel `<img>` nodes;
- actual visible carousel need: 1–3 slides;
- counter still needs the full logical slide count;
- nav buttons still need circular indexing across the full logical list.

The lower strip thumbnails are not part of this stage. They are visible navigation UI and already use smaller lazy thumbnails. This stage targets only the large hidden carousel scene.

## Proposed change

Add a pure helper:

- `getVisibleCarouselSlides(slides, activeIndex)`

The helper returns only the logical slides needed for the visual carousel:

- active;
- previous, when there is more than one slide;
- next, when there are more than two slides.

The helper keeps original slide indexes so `selectIndex(index)`, counter display, circular navigation and `onSelectImage` semantics continue to use the full logical slide list.

## Debt gate

Passed.

- This does not introduce a generic virtualizer.
- This does not move detail state out of the detail feature.
- This does not change SlotHost, layout placement, storage, generated image model or request snapshots.
- The carousel remains one feature-local component with one feature-local pure helper.
- The helper is testable without React/rendering infrastructure.

## Regression risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Two-slide carousel could render the same side slide twice as prev and next | Helper deduplicates indexes and preserves existing two-slide behavior: active + prev. |
| Active image sync could break | `activeIndex` remains the canonical state; helper only changes mounted DOM subset. |
| Pending state could disappear | Pending remains in the logical slides array and is rendered when active/adjacent. |
| Counter could become wrong | Counter still uses `slides.length`, not visible window length. |
| CSS/animation could change | Existing active/prev/next classes remain unchanged. |

## Implementation checklist

- [x] Create feature-local `carouselWindow.ts` pure helper.
- [x] Render `visibleSlides` instead of full `slides.map(...)`.
- [x] Keep `selectIndex` and `go` based on full logical slides.
- [x] Keep `activeIndex + 1 / slides.length` counter.
- [x] Add tests for empty, single, two-slide, large and pending-adjacent cases.
