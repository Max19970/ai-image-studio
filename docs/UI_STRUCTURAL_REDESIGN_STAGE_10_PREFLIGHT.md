# UI Structural Redesign — Stage 10 Preflight

## Stage
Stage 10 — Mobile adaptation hardening.

## Goal
Run a focused mobile-first pass after the main page redesigns and fix the mobile issues that remain across the primary flows: gallery, composer, attachments, parameters, detail, settings, batch and info.

## Preflight simulation

### 1. Composer mobile status behavior
Current composer expands its secondary status area for every `statusText`, including successful terminal tasks. On mobile this makes the compact composer taller even when the user does not need an actionable warning.

Planned change:
- In `src/app/workspace/useWorkspaceDerivedState.ts`, keep `rawJsonError`, active statuses, failed and cancelled statuses visible.
- Suppress terminal `succeeded` status text in the composer.

Expected result:
- The mobile composer returns to a compact one-line command bar after success.
- Active/error states still surface status information.

### 2. Attachment removal on touch devices
Attachment chips reveal the remove button on hover/focus. That is fine on desktop, but weak on touch devices where hover is absent.

Planned change:
- In `AttachmentImageStrip.module.css`, make the remove button visible in mobile/coarse-pointer mode.

Expected result:
- Mobile users can remove attachments without relying on hover.

### 3. Mobile input robustness
Several mobile inputs use font sizes below 16px. On iOS-like browsers this can trigger viewport zoom and make the layout feel unstable.

Planned change:
- In `src/styles/layers/mobile.css`, add mobile-only input minimum sizing and font-size guards for text/search/number/url/password inputs and textareas.
- Keep the rule inside the mobile layer to avoid desktop changes.

Expected result:
- Fewer mobile zoom/layout jumps when focusing inputs.

### 4. Screenshot runner reliability
Chromium in this container intermittently fails during visual QA with GPU initialization errors.

Planned change:
- Add `--disable-gpu` to the project screenshot runner launch args.

Expected result:
- More reliable mobile/tablet screenshot capture in the ChatGPT container without changing app runtime behavior.

## Architecture / debt analysis
- No UI state shape changes.
- No placement/slot changes.
- No generation, provider, storage or batch-runner logic changes.
- The composer status change is intentionally small and product-facing: successful terminal status is no longer a persistent mobile layout-expanding warning.
- Attachment removal visibility is a touch-target accessibility improvement, not a new interaction model.
- Screenshot runner change is tooling-only.

## Validation plan
- `npm run build`
- `npm run verify:static`
- Mobile screenshots: gallery, composer attachments, parameters, detail, settings, batch, info.
- Tablet sanity screenshots: gallery, detail, settings.
