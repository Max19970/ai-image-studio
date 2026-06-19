# UI Structural Redesign — Stage 7.2 Preflight

## Goal
Polish the Batch Composer request editor controls after Stage 7.1. The selected request editor now follows the regular composer pattern, but the controls button and footer/header action buttons looked slightly misaligned in screenshots, especially on mobile.

## Why
Batch request editing is the same user action as the regular composer repeated inside a queue. If the control button sits differently, the UI feels like a separate tool again and breaks composer parity.

## Planned change simulation

### `BatchDraftCardSection.module.css`
- Change the selected request `promptRail` from `auto minmax(0, 1fr)` with bottom alignment to an explicit `44px minmax(0, 1fr)` grid with center alignment.
- On mobile, keep the same explicit 44px control column instead of a 42px column that can make the 44px touch target visually bleed into the prompt field.

### `BatchDraftToolbarSection.module.css`
- Make the controls wrapper a fixed 44px grid cell.
- Center the trigger with `place-items: center`.
- Keep the trigger as a 44px touch target on mobile.
- Add explicit `line-height: 1` and inner span centering to avoid the ellipsis glyph looking optically shifted.

### `BatchDraftPromptSection.module.css`
- Add `box-sizing: border-box` to the prompt textarea to keep its visual height predictable next to the controls button.

### `BatchComposerFooterSection.module.css`
- Explicitly center footer action buttons with `inline-flex`, `align-items: center`, `justify-content: center`, and `line-height: 1`.
- Keep mobile footer button widths and labels unchanged.

### `BatchComposerHeaderSection.module.css`
- Explicitly center the close/back button content. No structural change.

## Architecture / debt analysis
- This is CSS-only alignment polish.
- No JSX state, command, slot, or provider/generation logic changes are needed.
- No new component should be introduced.
- Reusing the existing Stage 7.1 component structure avoids duplicating the regular composer while still making the batch editor visually consistent.

## Validation plan
- `npm run build`
- `npm run verify:static`
- Screenshot runner:
  - desktop/mobile `batch-composer`
  - desktop/mobile `batch-composer-controls`
- Manual visual check of the mobile controls trigger, prompt row, footer buttons, and desktop selected request row.
