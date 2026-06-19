# UI Structural Redesign — Stage 6 Preflight

## Stage
Stage 6 — Settings → workspace object editor.

## Why
Settings still carries the old dashboard pattern: one large tabbed glass card, inner card columns, editor cards, status cards and mobile accordions. This keeps the settings page visually heavier than the rest of the redesigned app and makes mobile settings feel like a compressed desktop dashboard.

## Simulated changes before implementation

### `src/features/settings/sections/desktop-content/SettingsDesktopContentSection.tsx`
- Keep the existing slot composition.
- Change only the shell class semantics from a heavy `glass-panel tabbedShell` to a lighter workspace object editor surface.
- No slot or registry contract change.

### `src/features/settings/SettingsPage.module.css`
- Increase desktop workspace max width so the split editor breathes.
- Replace the heavy card-like tabbed shell with a three-part editor workspace foundation:
  - left settings nav;
  - active section/object list;
  - selected object editor inside the section.
- Make mobile heading and tabs compact because mobile Settings/Info screens currently look oversized and odd.
- Keep mobile full redesign scoped to Settings only; Info page remains deferred.

### `src/features/settings/sections/generation-api/GenerationApiSettingsSection.tsx`
- Keep provider/model focus as explicit API object type selection.
- Rephrase the desktop area visually as an object workspace, not a sub-dashboard.
- Do not change draft/provider/model state logic.

### `src/features/settings/sections/generation-api/provider-list/ProvidersDesktop.tsx`
- Replace custom `entityCard` list buttons with shared `EntityList` / `EntityListItem` primitives.
- Replace the right editor column with `SideInspector` so it follows the same object-inspector pattern as the redesigned detail page.
- Keep add/remove/patch/check commands unchanged.

### `src/features/settings/sections/generation-api/model-list/ModelsDesktop.tsx`
- Same as provider list: shared `EntityList`, `SideInspector`, compact active model action.
- Keep `selectModel` behavior unchanged.

### `src/features/settings/sections/generation-api/GenerationApiDesktopPanels.module.css`
- Remove card-stack visual language from list/editor columns.
- Add compact entity-list toolbar, scrollable list region, and inspector body styles.

### `src/features/settings/sections/generation-api/GenerationApiEditor.module.css`
- Make editor a form group, not a nested card.
- Reduce field grid visual weight; leave `FieldShell` as the local reusable input primitive.

### `src/features/settings/sections/generation-api/GenerationApiMobilePanels.module.css`
- Make mobile cards more compact.
- Turn horizontal provider/model selection into lighter object chips.
- Keep accordions for now only as a mobile progressive-disclosure compromise; avoid adding deeper nesting.

### `src/features/settings/sections/interface/*`
- Keep the current functional theme/language controls.
- Visually reduce heavy card borders and make theme previews read as actual choices rather than nested panels.
- Ensure theme previews remain target-theme specific, not current-theme dependent.

## Technical debt analysis
- No domain/settings state changes are needed.
- No provider/model draft refactor is needed for this stage.
- Do not introduce a separate mobile settings router yet; current state ownership would make that larger than this stage. Instead, prepare the visual structure for a future route-like mobile flow.
- Use existing shared primitives (`EntityList`, `SideInspector`) instead of adding one-off settings-only object-list components.
- Keep slot placements stable to avoid migration churn.

## Implementation order
1. Update desktop settings shell CSS.
2. Convert API provider/model desktop lists to shared entity primitives + side inspector.
3. Reduce editor/check/mobile/settings visual weight.
4. Adjust interface settings card density.
5. Run static verification.
6. Capture settings screenshots: API, Models, Interface on desktop/mobile.

## Definition of Done
- Settings looks like an object editor rather than nested dashboard cards.
- Provider/model lists are compact and selectable without table/card bloat.
- Desktop uses the available width with stable split layout.
- Mobile Settings is less bulky and has no horizontal overflow.
- `npm run verify:static` passes.
