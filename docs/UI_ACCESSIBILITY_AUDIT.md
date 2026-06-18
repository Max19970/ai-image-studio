# UI accessibility and popover audit

Stage 12 hardened shared UI primitives that are used across settings, parameters, composer actions and field info surfaces.

## What changed

- `FloatingPopover` now exposes dismiss reasons, optional role/ARIA hooks, Escape focus return, and initial focus support.
- `PopoverSelect` now supports keyboard navigation for trigger/listbox flows:
  - ArrowDown / ArrowUp
  - Home / End
  - Enter / Space
  - Escape with focus return
- Field info popovers now expose tooltip semantics and connect trigger ↔ popover with `aria-controls` / `aria-describedby`.
- Shared `IconButton` now requires an accessible label at the type level.
- Workspace tab buttons now expose `aria-current="page"` for the active app section.
- Coarse pointer touch-target guards are present for select options, icon buttons and composer action buttons.

## Regression guard

`npm run ui:check` verifies the expected primitive contracts and runs as part of `npm run verify:static`.

The check is intentionally static and lightweight. It does not replace browser-based manual QA, but it prevents the most common regressions from silently returning.

## Manual QA still recommended

Use a real browser session to verify:

- opening and closing every dropdown with keyboard only;
- Escape closes popovers and returns focus to the trigger;
- outside click closes popovers without stealing focus;
- Tab order around parameters/settings remains understandable;
- mobile touch targets feel usable without making the layout too bulky;
- popovers near viewport edges choose a usable side and width.
