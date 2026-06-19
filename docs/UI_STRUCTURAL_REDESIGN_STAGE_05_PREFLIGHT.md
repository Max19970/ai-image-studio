# UI Structural Redesign — Stage 5 Preflight

Stage: 5 — Detail page → artwork stage + inspector  
Status: implemented and checked  
Date: 2026-06-18

---

## Goal

Turn the detail page from a report-like generation log into an image-first result viewer.

The page must make the generated image the main object, move prompt/params/files/status into a detail inspector, and hide raw payload/response data behind an explicitly technical area.

---

## Current code shape

Relevant files:

- `src/features/detail/ImageDetailPage.tsx`
- `src/features/detail/ImageDetailPage.module.css`
- `src/features/detail/sections/topbar/DetailTopbarSection.tsx`
- `src/features/detail/sections/topbar/DetailTopbarSection.module.css`
- `src/features/detail/sections/hero/DetailHeroSection.tsx`
- `src/features/detail/sections/hero/DetailHeroSection.module.css`
- `src/features/detail/sections/request-drawer/DetailRequestDrawerSection.tsx`
- `src/features/detail/sections/request-drawer/DetailRequestDrawerSection.module.css`
- `src/features/detail/sections/snapshot/DetailSnapshotSections.tsx`
- `src/features/detail/sections/snapshot/DetailSnapshotSections.module.css`
- `src/interface/context/workspace/detail.ts`
- `src/interface/placements/detail.layout.placement.ts`

Current layout:

```txt
page
  topbar sticky
  hero card
  request drawer below hero
    two-column report layout
    prompt card / attachments card / status card / params card / payload details
```

Current debt symptoms:

- `requestOpen` / `setRequestOpen` exists only to hide/show the whole report below the image.
- Hero owns a foldout button for details, which is a dashboard-era pattern.
- `DetailRequestDrawerSection` is named as a drawer but behaves like a below-stage report area.
- `SnapshotSections` renders a heavy two-column composition grid instead of inspector groups.
- Technical JSON payloads are open by default in the main detail flow.
- Topbar is sticky on desktop, which repeats the earlier “status sticks to header” visual bug class.
- `DetailHeroSection.module.css` has a malformed duplicate `.actionBar :global(.accent-action)` rule from earlier edits.

---

## Planned architecture change

### 1. Page shell

Replace the vertical layout:

```tsx
<SlotHost slot="detail/topbar" />
<SlotHost slot="detail/hero" />
<SlotHost slot="detail/request-drawer" />
```

with an explicit detail workspace:

```tsx
<SlotHost slot="detail/topbar" />
<div className={styles.workspace}>
  <SlotHost slot="detail/hero" />
  <SlotHost slot="detail/request-drawer" />
</div>
```

Desktop CSS target:

```css
.workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(340px, 390px);
  gap: clamp(14px, 2vw, 24px);
  align-items: start;
}
```

Mobile CSS target:

```css
.workspace {
  grid-template-columns: 1fr;
}
```

### 2. Remove old foldout state

Remove from `ImageDetailPage.tsx`:

```tsx
const [requestOpen, setRequestOpen] = useState(true);
```

Remove from `DetailLayoutContext`:

```ts
requestOpen: boolean;
setRequestOpen: Dispatch<SetStateAction<boolean>>;
```

Reason: the page no longer hides/shows a below-image report. Detail information is always available as inspector/tabs.

### 3. Hero becomes artwork stage

In `DetailHeroSection.tsx`:

- remove foldout button;
- remove `requestOpen` usage;
- keep image/carousel/placeholder logic;
- keep detail actions, but visually treat them as contextual stage actions;
- keep thumbnails for multi-result output.

The code changes from:

```tsx
<button className={styles.foldoutButton} onClick={() => context.setRequestOpen(...) } />
```

to no foldout button at all.

CSS cleanup:

- delete `.foldoutButton` styles;
- fix duplicate malformed `.actionBar :global(.accent-action)` block;
- make hero card/stage more image-first and less “card dashboard”.

### 4. Request drawer becomes inspector

Keep the placement id and slot stable:

- keep `detail/request-drawer` slot;
- keep `detail.sections.requestDrawer` definition;
- internally repurpose it into a detail inspector.

Reason: this avoids unnecessary placement/registry migration while changing the actual UX semantics.

`DetailRequestDrawerSection.tsx` target:

```tsx
const [activeTab, setActiveTab] = useState<DetailInspectorTab>('prompt');

return (
  <SideInspector ...>
    <div className={styles.mobileTabs}>...</div>
    <SnapshotSections task={context.task} activeImage={context.activeImage} activeMobileTab={activeTab} />
  </SideInspector>
);
```

Desktop: render all inspector groups stacked.  
Mobile: render tab controls and only active tab content.

### 5. Snapshot sections become inspector groups

Replace two-column report layout with compact groups:

Single task groups:

- prompt;
- files;
- params;
- status/meta;
- technical.

Batch task groups:

- batch prompts/items;
- batch files;
- batch params/status;
- batch technical payloads.

Raw data rules:

- `snapshot.payload` must be collapsed by default;
- `task.raw` collapsed by default;
- `activeImage.raw` collapsed by default;
- batch raw payloads collapsed by default.

### 6. Attachments terminology

Stage 4.1 flattened composer attachments in the UI but kept mask separate. Detail should follow the user-facing language:

- ordinary `target/reference` attachments are shown as images;
- `mask` is shown as a separate mask control/asset;
- do not emphasize `source/reference` terminology in headings.

The persisted snapshot still stores roles, so this stage must not migrate stored data.

### 7. Topbar becomes static command bar

`DetailTopbarSection` target:

- no sticky positioning;
- compact command bar style;
- back action, title/status line, status pill;
- not competing with the image stage.

---

## Debt risk analysis

### Risk 1 — adding a second detail model next to the old snapshot model

Bad path:

- create new inspector data derivation while keeping old `SnapshotSections` report intact;
- duplicate prompt/params/files rendering in two places.

Mitigation:

- refactor `SnapshotSections` itself into the inspector renderer;
- keep existing data helpers (`sentParameters`, `expectedImageCount`) instead of new duplicate helpers.

### Risk 2 — changing placement contracts too early

Bad path:

- rename `detail/request-drawer` to `detail/inspector` immediately;
- update registry/placements/tests in one broad sweep;
- create compatibility bugs.

Mitigation:

- keep slot and definition ids stable in Stage 5;
- document the semantic mismatch as transitional naming;
- rename slots later only if registry migration is needed project-wide.

### Risk 3 — mobile tabs duplicating desktop inspector JSX

Bad path:

- build a separate mobile detail component that repeats prompt/files/params logic.

Mitigation:

- one `SnapshotSections` renderer accepts optional `activeMobileTab`;
- desktop passes `undefined` and shows all groups;
- mobile tab filtering is CSS/prop-driven around the same sections.

### Risk 4 — raw technical data still visually dominating

Bad path:

- move JSON details into inspector but leave them open.

Mitigation:

- all code/raw technical sections are collapsed by default;
- technical is last tab/group.

---

## Implementation checklist

- [ ] Remove `requestOpen` and `setRequestOpen` from detail context.
- [ ] Rebuild `ImageDetailPage` into topbar + stage/inspector workspace.
- [ ] Convert topbar to static compact command bar.
- [ ] Remove hero foldout button.
- [ ] Fix malformed hero CSS.
- [ ] Convert request drawer section into SideInspector-based detail inspector.
- [ ] Add mobile inspector tabs.
- [ ] Convert snapshot sections from two-column report to compact inspector groups.
- [ ] Collapse technical JSON by default.
- [ ] Keep old placement ids stable.
- [ ] Update roadmap status.
- [ ] Run static checks and build.
- [ ] Capture visual smoke screenshots for desktop/mobile detail and baseline scenarios.

---

## Definition of Done

- Detail page reads as artwork stage + detail inspector.
- Topbar no longer sticks to viewport while scrolling.
- Prompt/params/files/status are visible but secondary to the image.
- Technical JSON is available but not visually primary.
- Mobile detail starts with image and uses compact tabs below.
- No generation/provider/storage behavior changes.

---

## Implementation result

- Detail page shell now renders topbar + stage/inspector workspace.
- Foldout request drawer state was removed.
- The old `detail/request-drawer` slot is kept as a stable compatibility slot but now renders a SideInspector-based request inspector.
- Mobile inspector uses tabs for prompt, params, files and technical data.
- Raw technical payloads are collapsed by default.
- Static verification passed after removing a filter transition caught by `motion:check`.
- Visual smoke screenshots were captured for desktop/mobile detail, detail technical, gallery, settings API and batch composer.
