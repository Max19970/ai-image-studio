# UI Structural Redesign — Stage 5.2 Preflight

## Goal
Fix the desktop detail page artwork overflow bug where the active image visually escapes the stage container and overlaps the lower action bar area.

## Why this is happening
The single-image detail stage used an `img` with `width/height: auto` and no guaranteed overflow clipping on the `imageStage` container. In some viewport/layout combinations the image respected aspect ratio but still painted beyond the intended visual stage region.

## Planned change
A narrow CSS-only correction in `src/features/detail/sections/hero/DetailHeroSection.module.css`:

1. Make `imageStage` an explicit containment boundary:
   - add `min-width: 0`
   - keep `min-height: 0`
   - add `overflow: hidden`

2. Make the single-image sizing use the available stage box directly:
   - set `width: 100%`
   - set `height: 100%`
   - keep `max-width: 100%` and `max-height: 100%`
   - keep `object-fit: contain`
   - add `object-position: center`

## Debt / architecture analysis
- No JSX or slot-contract change is needed.
- No new component is introduced.
- No state or layout-context change is needed.
- This avoids a larger refactor because the bug is local to the hero-section rendering contract.
- The fix improves containment semantics instead of adding one-off hacks like hardcoded heights.

## Validation plan
- `npm run build`
- `npm run verify:static`
- manual visual confirmation should show the image fully contained within the stage card while preserving aspect ratio.
