# UI Structural Redesign — Stage 8.1 Preflight

## Goal
Redesign the desktop Parameters modal into a proper settings/editor workspace instead of a centered modal where navigation and fields visually compete in the same middle column.

## Problems observed
- The desktop Parameters modal is still too narrow for a multi-section editor.
- Parameter tabs are technically on the side, but visually they are nested inside the same central content block, so the modal still feels like a card-with-tabs rather than a workspace.
- The body scroll belongs too much to the outer modal instead of the active editor area.
- The modal needs a clearer hierarchy: header → side navigation → active parameter editor → footer.

## Planned changes

### ParametersModal.module.css
- Increase desktop modal width to a wider workspace shell.
- Make the modal height explicit and viewport-bounded.
- Remove body-level scrolling on desktop; the active editor panel should own scroll.
- Give header/footer their own separated chrome with borders and blur.
- Keep mobile full-screen sheet behavior.

### ParameterPanel.tsx
- Keep existing tab state and parameter slot rendering.
- Replace the stray `summary` element used as a title with a regular heading element.
- Do not change generation parameter registry, slots, state shape, or provider logic.

### ParameterPanel.module.css
- Turn desktop layout into a true split workspace:
  - fixed side tab rail,
  - scrollable editor area,
  - no nested “card inside card inside modal” feeling.
- Preserve horizontal tab strip behavior on mobile.
- Keep parameter fields and registry-rendered controls intact.

## Architecture / debt analysis
- No domain or provider changes.
- No slot contract changes.
- No new component abstraction is needed yet; this is a feature-owned modal layout correction.
- This reduces UI debt by making the existing ParameterPanel responsible for editor workspace layout instead of requiring modal-level hacks later.

## Validation plan
- `npm run build`
- `npm run verify:static`
- Screenshot scenarios:
  - desktop/mobile `parameters`
  - desktop `parameters-render`
  - desktop `parameters-output`
