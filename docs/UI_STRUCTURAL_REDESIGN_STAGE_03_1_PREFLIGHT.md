# UI Structural Redesign — Stage 3.1 preflight

Status: planned before code changes, 2026-06-18.  
Stage: 3.1 — Gallery Peek Inspector correction.

This document follows the required preflight-simulation protocol before implementation. It exists because Stage 3 introduced the right idea — a contextual gallery inspector — but the default always-on right column is too visually active and can become a new dashboard-like surface.

---

## Stage goal

Replace the always-visible gallery side inspector with an explicit Peek Inspector:

- the image wall keeps the full workspace width by default;
- clicking an image still opens the existing Detail page;
- hover/focus only reveals lightweight tile actions;
- opening metadata requires an explicit info action;
- the inspector appears as a fixed desktop overlay and as a mobile bottom sheet;
- opening/closing the inspector must not cause the image wall/grid to reflow.

This is a corrective sub-stage before moving to the next full roadmap stage.

---

## Current problem in code

Stage 3 currently stores `inspectionState` in `ResultsGallery` and resolves a target through `resolveGalleryInspectionTarget`.

Problem details:

- `resolveGalleryInspectionTarget(tasks, null)` returns `tasks[0]`, so the inspector is effectively active by default.
- `GalleryGridSection` renders `wallWorkspace` as a two-column grid: image wall + inspector.
- `GalleryResultCardSection` and `GalleryPlaceholderCardSection` call inspection handlers from `onMouseEnter` / `onFocusCapture`.
- When a tile changes inspection target, the inspector content updates even if the user only moved the pointer across the wall.
- The desktop inspector occupies layout space, so the gallery wall is narrower even when metadata is not needed.
- Mobile currently hides the inspector completely, so quick metadata is unavailable without opening details.

The architecture is still healthy: gallery remains slot-driven and generation/storage/provider code is not involved. The issue is interaction semantics.

---

## Planned refactoring before visual work

### Refactor A — change inspection state semantics from implicit selection to explicit peek

**Files:**

- `src/features/gallery/model/galleryInspection.ts`
- `src/features/gallery/ResultsGallery.tsx`
- `src/interface/context/workspace/gallery.ts`

**Planned change:**

`resolveGalleryInspectionTarget` must return `null` when no explicit state exists:

```ts
export function resolveGalleryInspectionTarget(tasks: GenerationTask[], state: GalleryInspectionState | null): GalleryInspectionTarget | null {
  if (!state || tasks.length === 0) return null;
  const task = tasks.find((candidate) => candidate.id === state.taskId);
  if (!task) return null;
  ...
}
```

`GalleryInspectionControls` changes from passive/hover language:

```ts
inspectTask(target)
clearInspection()
```

to explicit peek language:

```ts
openPeek(target)
closePeek()
```

**Architecture risk:** a rename can churn many components.

**Mitigation:** only gallery contexts and gallery sections are touched. No registry ids, provider code, storage code, task lifecycle code, or workspace-level commands change.

---

### Refactor B — remove hover-driven inspection from tile components

**Files:**

- `src/features/gallery/sections/card-result/GalleryResultCardSection.tsx`
- `src/features/gallery/sections/card-placeholder/GalleryPlaceholderCardSection.tsx`
- `src/features/gallery/sections/grid/GalleryGridSection.tsx`

**Planned change:**

Remove:

```tsx
onMouseEnter={inspect}
onFocusCapture={inspect}
```

and replace `onInspectTask` with an explicit `onPeekTask` callback invoked only by an info button:

```tsx
<button
  type="button"
  className={styles.infoButton}
  onClick={(event) => {
    event.stopPropagation();
    context.onPeekTask(activeImage);
  }}
>
  i
</button>
```

Clicking the image button remains unchanged:

```tsx
onClick={() => context.onOpenTask(activeImage ?? undefined)}
```

**Architecture risk:** hard-coding a new info action inside the tile could bypass placement architecture.

**Mitigation:** this is not a reusable command like delete/download. It is the tile's native affordance for opening its own contextual peek, similar to carousel badges/status overlays. Existing action slots stay intact for delete/download.

---

### Refactor C — make the inspector an overlay, not a layout column

**Files:**

- `src/features/gallery/sections/grid/GalleryGridSection.tsx`
- `src/features/gallery/ResultsGallery.module.css`
- `src/features/gallery/sections/inspector/GalleryInspectorSection.tsx`
- `src/features/gallery/sections/inspector/GalleryInspectorSection.module.css`

**Planned change:**

`wallWorkspace` becomes a single-column/full-width workspace:

```css
.wallWorkspace {
  position: relative;
  padding: 22px 24px 24px;
}
```

The inspector stays in the same `gallery/inspector` slot but its CSS becomes fixed overlay:

```css
.galleryInspector {
  position: fixed;
  top: 92px;
  right: 24px;
  bottom: calc(var(--composer-dock-space, 150px) + 20px);
  width: min(380px, calc(100vw - var(--sidebar-width, 0px) - 48px));
  z-index: 42;
  animation: galleryPeekIn ...;
}
```

**Architecture risk:** fixed positioning can collide with composer/sidebar.

**Mitigation:** use existing shell variables where possible, keep conservative `top/right/bottom`, and hide the desktop overlay under the mobile breakpoint. Stage 4/5 can later centralize shell overlay tokens if more overlays appear.

---

### Refactor D — mobile quick metadata via existing BottomSheet primitive

**Files:**

- `src/features/gallery/sections/inspector/GalleryInspectorSection.tsx`
- `src/features/gallery/sections/inspector/GalleryInspectorSection.module.css`

**Planned change:**

Render desktop fixed `SideInspector` and mobile `BottomSheet` from the same resolved target and the same inspector body component.

```tsx
<SideInspector className={styles.galleryInspector}>...</SideInspector>
<BottomSheet open={Boolean(target)} onClose={context.inspection.closePeek}>...</BottomSheet>
```

The shared `BottomSheet` already hides itself on desktop via CSS, so this does not create a second desktop surface.

**Architecture risk:** duplicate inspector body markup.

**Mitigation:** extract local `InspectorBody` and `InspectorPreview` helpers inside `GalleryInspectorSection.tsx`. The same body renders in desktop and mobile.

---

## Planned feature/UI changes

### Change A — default gallery state

Default Gallery shows:

```txt
[ image wall full width ]
```

No inspector is visible until the user explicitly opens it.

### Change B — tile interaction

- Image click: open full Detail page.
- Hover/focus: reveal delete/download/info overlay actions.
- Info click: open Peek Inspector.
- No pointer movement should update selected metadata.

### Change C — desktop Peek Inspector

Desktop inspector appears as a fixed overlay over the right side of the workspace. It includes:

- preview/status;
- mode/provider/model/image count;
- prompt excerpt;
- attachments/warnings/error notes;
- `Details` action;
- `Close` action.

It does not resize the image wall.

### Change D — mobile Peek Inspector

Mobile info action opens a bottom sheet with the same metadata and actions. The full image click still opens details.

---

## What intentionally does not change

- No Detail page redesign.
- No batch composer redesign.
- No provider/storage/generation lifecycle changes.
- No placement id rename from `gallery/card` to `gallery/tile` yet.
- No permanent pinned inspector mode yet; this can be added later if the explicit peek proves useful.
- No hover-based selection.

---

## Checks after implementation

Required static checks:

- `npm run verify:static`
- `npm run build` if not already included in the full verification output

Required visual smoke checks:

- desktop gallery default: no permanent inspector column;
- desktop gallery after info click: overlay inspector opens without moving tiles;
- mobile gallery default;
- mobile gallery after info click: bottom sheet opens;
- existing gallery image click still opens details;
- desktop/mobile settings, detail, batch composer smoke screenshots to ensure shared primitives did not regress.

---

## Definition of Done

- Gallery has no always-on inspector by default.
- Opening metadata is explicit through an info action.
- Hover/focus no longer changes inspector target.
- Desktop inspector is overlay/fixed and does not participate in image wall layout.
- Mobile gets bottom sheet metadata.
- Existing open-detail click path still works.
- Static checks pass.
- Visual smoke screenshots are captured and reviewed.
