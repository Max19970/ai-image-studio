# UI Structural Redesign — Stage 3 preflight

Status: planned before code changes, 2026-06-18.  
Stage: 3 — Gallery → Image Wall + contextual inspector.

This document is the required simulation pass before implementation. It describes the intended code changes, architecture impact, refactoring needed before visual work, and the checks that must stay green.

---

## Stage goal

Turn Gallery from a card dashboard into an image-first workspace.

The result grid should become an Image Wall: images are the primary surface, task metadata moves into a contextual inspector/detail entry point, and actions become contextual overlays instead of permanent footer/header noise.

Stage 3 must not redesign Detail page, storage, provider adapters, generation lifecycle, or batch runner internals.

---

## Current problem in code

Gallery is already modular through interface placements:

- `gallery/header`
- `gallery/content`
- `gallery/card`
- `gallery/card-actions`
- `gallery/card-footer-actions`
- `gallery/header-actions`

The problem is not placement architecture. The problem is the visual/interaction pattern inside Gallery:

- `GalleryResultCardSection` and `GalleryPlaceholderCardSection` wrap every task in `Card`.
- Every task has a permanent footer with metadata/actions.
- Download lives in a footer slot, so image tiles need footer structure even when the action belongs in an overlay.
- Header filters are a wide mini-form, which makes Gallery feel like an archive dashboard.
- There is no gallery-level contextual inspector, so the only places for metadata are cards or the full detail page.
- Mobile filters are still inline controls instead of a bottom sheet.

---

## Planned refactoring before visual work

### Refactor A — make gallery inspection explicit in context

**Why:** if the inspector reads hover/focus state through local component hacks, gallery metadata becomes implicit and hard to reuse. The selected/inspected task must be a first-class gallery context concern.

**Files:**

- `src/interface/context/workspace/gallery.ts`
- `src/features/gallery/ResultsGallery.tsx`

**Planned code shape:**

```ts
export interface GalleryInspectionTarget {
  task: GenerationTask;
  activeImage: GeneratedImage | null;
  galleryIndex: number;
}

export interface GalleryInspectionControls {
  target: GalleryInspectionTarget | null;
  inspectTask: (target: GalleryInspectionTarget) => void;
  clearInspection: () => void;
}

export interface GalleryLayoutContext extends WorkspaceGalleryContext {
  archive: GalleryArchiveControls;
  inspection: GalleryInspectionControls;
}
```

`ResultsGallery` will keep a small state shape by ids, not by storing stale task objects:

```ts
const [inspection, setInspection] = useState<{ taskId: string; imageId?: string } | null>(null);
```

Then it will resolve the current `GalleryInspectionTarget` from `archiveResult.tasks` / `archiveResult.filteredTasks` on every render.

**Architecture risk:** gallery state can grow into a second detail page.

**Mitigation:** inspection stores only ids and exposes only preview/selection. Opening full detail still goes through existing `commands.openTaskDetail`.

---

### Refactor B — split Gallery "grid" semantics into image wall without changing placement slot contracts

**Why:** existing `gallery.layout.placement.ts` and slot ids are healthy. Renaming all placement ids would create churn and risk. The implementation can change from grid/cards to Image Wall while preserving stable slot contracts.

**Files:**

- `src/features/gallery/sections/grid/GalleryGridSection.tsx`
- `src/interface/placements/gallery.layout.placement.ts`

**Planned code shape:**

`GalleryGridSection` keeps the same definition id for compatibility, but renders a workspace wrapper:

```tsx
<div className={styles.wallWorkspace} data-gallery-slot="workspace">
  <div className={styles.imageWall} data-gallery-slot="image-wall">
    <SlotHost slot="gallery/card" ... />
  </div>
  <SlotHost slot="gallery/inspector" context={context} as={null} />
</div>
```

A new placement is added:

```ts
{
  id: 'gallery.layout.inspector',
  slot: 'gallery/inspector',
  use: 'gallery.sections.inspector',
  order: 10,
  enabled: (context) => context.archive.filteredCount > 0
}
```

**Architecture risk:** `gallery/card` name becomes semantically outdated.

**Mitigation:** keep it for Stage 3 compatibility and call out that the slot now means "gallery item/tile contribution". A later interface cleanup can rename it if/when other consumers are updated.

---

### Refactor C — move tile actions into overlay while keeping action slots

**Why:** delete/download are already slot-driven. We should not hard-code them directly into the tile component.

**Files:**

- `src/features/gallery/sections/card-result/GalleryResultCardSection.tsx`
- `src/features/gallery/sections/card-placeholder/GalleryPlaceholderCardSection.tsx`
- `src/features/gallery/elements/shared/GallerySlotElements.tsx`
- `src/features/gallery/ResultsGallery.module.css`

**Planned code shape:**

Replace:

```tsx
<Card as="article" interactive className={styles.card}>...</Card>
<footer className={styles.footer}>...</footer>
```

with:

```tsx
<article className={cx(styles.tile, inspected && styles.inspectedTile)}>
  <button className={styles.tileMediaButton} ... />
  <div className={styles.tileOverlay}>
    <SlotHost slot="gallery/card-actions" ... />
    <SlotHost slot="gallery/card-footer-actions" ... />
  </div>
</article>
```

The existing footer-action placement remains valid, but visually it becomes overlay action content.

**Architecture risk:** action slots may be visually tied to Gallery CSS.

**Mitigation:** actions already belong to Gallery feature. Shared primitives remain untouched.

---

## Planned feature/UI changes

### Change A — `ImageTile` behavior

Each generated tile will show:

- image as the main surface;
- status pill only when useful;
- sequence badge for multi-image/batch tasks;
- hover/focus overlay with delete/download/open hints;
- no permanent metadata footer.

Click still opens the existing detail view to avoid changing navigation semantics before Stage 5.

Hover/focus/tap will update the contextual inspector target.

---

### Change B — placeholder/status tile

Pending/running/failed tasks without images will use the same tile footprint as image results.

Instead of a large report card, the tile shows:

- spinner/status symbol;
- short status label;
- short error/sent hint;
- contextual delete action.

This keeps unfinished tasks visible and cancellable without making them heavy dashboard cards.

---

### Change C — contextual side inspector

Add a new gallery section:

```txt
src/features/gallery/sections/inspector/GalleryInspectorSection.tsx
src/features/gallery/sections/inspector/definition.ts
```

The inspector uses the shared `SideInspector` primitive and displays compact metadata:

- thumbnail/preview of inspected image;
- status/mode/kind;
- prompt excerpt;
- provider/model;
- image count/attachments/warnings;
- error if present;
- action to open full detail.

Desktop: sticky side inspector.  
Mobile: hidden for Stage 3; full detail remains the metadata path until Stage 5/10 mobile flows.

**Architecture risk:** duplicating detail page logic.

**Mitigation:** inspector only previews metadata and delegates full view to `openTaskDetail`. No raw payload/details expansion is added.

---

### Change D — compact command/filter header

Replace the wide form-like archive controls with a compact command/filter area.

**Files:**

- `src/features/gallery/sections/header/GalleryHeaderSection.tsx`
- `src/features/gallery/sections/header/GalleryHeaderSection.module.css`
- `src/shared/i18n/locales/{ru,en}/gallery.json`

Desktop:

```tsx
<CommandBar className={styles.commandBar} density="compact">
  <label className={styles.searchField}>...</label>
  <div className={styles.desktopFilters}>...</div>
  <SlotHost slot="gallery/header-actions" ... />
</CommandBar>
<FilterTokens />
```

Mobile:

- search stays inline;
- status/kind/sort controls move into `BottomSheet`;
- active filters appear as compact tokens.

**Architecture risk:** header grows too much local state.

**Mitigation:** the only local state is `filtersOpen` for the mobile sheet. Archive state remains in `ResultsGallery`.

---

### Change E — simpler empty/filtered state

Replace decorative framed empty illustration with a quieter empty state that points to composer without adding another glass card.

---

## Files planned to change

### Add

- `docs/UI_STRUCTURAL_REDESIGN_STAGE_03_PREFLIGHT.md`
- `src/features/gallery/sections/inspector/GalleryInspectorSection.tsx`
- `src/features/gallery/sections/inspector/definition.ts`

### Modify

- `docs/UI_STRUCTURAL_REDESIGN_PLAN.md`
- `src/interface/context/workspace/gallery.ts`
- `src/interface/placements/gallery.layout.placement.ts`
- `src/features/gallery/ResultsGallery.tsx`
- `src/features/gallery/ResultsGallery.module.css`
- `src/features/gallery/galleryUi.tsx`
- `src/features/gallery/sections/grid/GalleryGridSection.tsx`
- `src/features/gallery/sections/card-result/GalleryResultCardSection.tsx`
- `src/features/gallery/sections/card-placeholder/GalleryPlaceholderCardSection.tsx`
- `src/features/gallery/sections/header/GalleryHeaderSection.tsx`
- `src/features/gallery/sections/header/GalleryHeaderSection.module.css`
- `src/features/gallery/elements/shared/GallerySlotElements.tsx`
- `src/shared/i18n/locales/en/gallery.json`
- `src/shared/i18n/locales/ru/gallery.json`

### Delete

None planned.

**Why no deletes:** existing section folders and definition ids are part of the interface registry. Stage 3 changes semantics gradually to avoid unnecessary placement churn.

---

## What intentionally does not change in Stage 3

- No storage model changes.
- No generation runner or batch runner changes.
- No provider/model settings changes.
- No full Detail page redesign.
- No composer redesign.
- No new global CSS page-specific tokens.
- No destructive rename of `gallery/card` slots.

---

## Debt risk analysis

### Risk 1 — Gallery becomes two competing detail views

**Risk:** contextual inspector could duplicate full Detail page.

**Decision:** inspector is preview-only. Full prompt/params/raw technical data stays in Detail until Stage 5.

### Risk 2 — mobile gets another cramped desktop layout

**Risk:** side inspector squeezed below image wall on mobile.

**Decision:** inspector is hidden on mobile for this stage. Metadata access remains tile → Detail until dedicated mobile detail flow.

### Risk 3 — filters become another popover system

**Risk:** creating custom mobile filter modal duplicates `BottomSheet`.

**Decision:** use Stage 1 `BottomSheet`; no ad-hoc mobile modal CSS.

### Risk 4 — old slot names become misleading

**Risk:** `gallery/card` now renders tiles.

**Decision:** keep slots stable during Stage 3. Document semantic drift. Rename only in a later interface cleanup if needed.

---

## Checks after implementation

- `npm run verify:static`
- `npm run build`
- Visual screenshots:
  - desktop gallery;
  - mobile gallery;
  - sidebar-collapsed gallery;
  - settings/detail/batch smoke to catch shell regressions;
  - ideally filtered state and pending/error state if screenshot fixtures provide it.

Visual acceptance:

- Gallery reads as image wall, not dashboard cards.
- Tile actions remain accessible by hover/focus and always accessible enough on mobile.
- Delete/cancel unfinished task remains available.
- Download remains available for generated images.
- Header controls are compact.
- Mobile filters use bottom sheet, not inline stacked selects.
- No layout overflow with bottom navigation/composer dock.
