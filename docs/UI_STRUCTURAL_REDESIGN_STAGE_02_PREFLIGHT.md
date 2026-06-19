# UI Structural Redesign — Stage 2 preflight

Status: planned before code changes, 2026-06-18.  
Stage: 2 — App shell and desktop/mobile navigation model.

This document is the required simulation pass before implementation. It describes the intended code changes, architecture impact, refactoring needed before visual work, and the debt checks that must stay green.

---

## Stage goal

Separate desktop and mobile shell semantics without redesigning Gallery, Settings, Detail or Composer content yet.

Desktop should use a persistent rail + workspace. Mobile should use content-first pages with a bottom navigation bar and sheets/drawers only as secondary layers.

Stage 2 must not rebuild Gallery, Detail, Settings, Batch or Composer internals. It only prepares the shell so later stages can replace page layouts without fighting the old desktop-first navigation.

---

## Current problem in code

The app shell is currently assembled in `src/app/App.tsx`:

```tsx
<main className="studio-app ...">
  <div className="studio-noise" />
  <SlotHost slot="workspace/sidebar" />
  <section className="studio-main">
    <SlotHost slot="workspace/main" />
  </section>
  <SlotHost slot="workspace/dock" />
  <SlotHost slot="workspace/modals" />
</main>
```

This is architecturally fine, but mobile behavior is still too close to the desktop sidebar model:

- `StudioSidebar.tsx` owns both desktop rail and mobile drawer.
- Mobile primary navigation is a floating top-left trigger that opens a drawer.
- The drawer reuses sidebar tab placements as the main mobile path.
- There is no first-class mobile bottom navigation surface.
- Composer dock is fixed to the bottom on mobile, so a new bottom nav must explicitly reserve space instead of overlapping it.

The risk is that later mobile redesign stages would add separate one-off bottom buttons in each feature, creating fragmented navigation.

---

## Planned refactoring before visual work

### Refactor A — extend navigation variant semantics

**Why:** `SidebarSlotVariant` currently has only `expanded`, `collapsed`, and `mobile`. The word `mobile` currently means drawer row, not bottom navigation. If reused for a bottom bar, `WorkspaceTabButton` would mix two different interaction patterns behind one variant.

**File:** `src/interface/context/workspace/tabs.ts`

**Planned change:**

```ts
export type SidebarSlotVariant = 'expanded' | 'collapsed' | 'mobile' | 'bottom';
```

**Architecture risk:** adding variants can become a dumping ground.

**Mitigation:** `bottom` is shell-level navigation only. It does not introduce page-specific logic, and it reuses existing placement definitions.

---

### Refactor B — make `NavigationButton` support bottom navigation explicitly

**Why:** bottom nav buttons need different sizing and label/icon layout than drawer/mobile rows. Reusing the `mobile` variant would make the drawer and bottom nav visually coupled.

**Files:**

- `src/shared/ui/NavigationButton/NavigationButton.tsx`
- `src/shared/ui/NavigationButton/NavigationButton.module.css`
- `src/interface/primitives/WorkspaceTabButton.tsx`

**Planned code shape:**

```ts
export interface NavigationButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  icon?: ReactNode;
  variant?: 'list' | 'rail' | 'card' | 'mobile' | 'bottom';
}
```

`WorkspaceTabButton` will map variants like this:

```ts
const variant = context.variant === 'bottom'
  ? 'bottom'
  : context.variant === 'mobile'
    ? 'mobile'
    : tab === 'settings'
      ? 'card'
      : 'list';
```

**Architecture risk:** shared button becomes too visual-specific.

**Mitigation:** bottom navigation is a shared navigation primitive, not a feature-specific style. It remains purely presentational.

---

### Refactor C — split shell intent inside `StudioSidebar.tsx` without changing placements

**Why:** the placement `workspace.sidebar.default` and definition `workspace.sidebar` are already stable. Replacing them with new placement IDs would add churn without architectural benefit. The safer move is to keep the definition and make its internals render two explicit shell surfaces:

- desktop rail;
- mobile bottom navigation;
- optional secondary mobile drawer.

**Files:**

- `src/features/workspace/StudioSidebar.tsx`
- `src/features/workspace/StudioSidebar.module.css`

**Planned code shape:**

Add a small internal component:

```tsx
function MobileBottomNavigation({ activeTab, open, onOpenMenu, onCloseMenu, onTabChange }: ...) {
  const bottomContext = useMemo<SidebarTabContext>(() => ({
    activeTab,
    variant: 'bottom',
    onTabChange
  }), [activeTab, onTabChange]);

  return (
    <nav className={styles.mobileBottomNav} data-workspace-navigation aria-label={t('nav.sections')}>
      <div className={styles.mobileBottomTabs}>
        <SlotHost slot="sidebar/main-tabs" context={bottomContext} as={null} />
        <SlotHost slot="sidebar/footer-tabs" context={bottomContext} as={null} />
      </div>
      <button data-testid="mobile-drawer-trigger" ... />
    </nav>
  );
}
```

`StudioSidebar` will render desktop rail for desktop media and always render `MobileBottomNavigation`, which CSS hides on desktop.

**Important:** the drawer stays, but it becomes a secondary navigation/menu layer. The bottom bar becomes the primary mobile path because it has `data-workspace-navigation` and direct tab buttons.

**Architecture risk:** `StudioSidebar` name becomes semantically outdated.

**Mitigation:** keep filename during Stage 2 to avoid unnecessary import churn. A later cleanup can rename it to `StudioNavigation` only if more shell splitting is needed. The definition label can be updated to “Workspace navigation shell”.

---

## Planned visual/layout changes

### Change A — app shell tokens

**File:** `src/styles/layers/app-shell.css`

Add/normalize shell spacing variables:

```css
.studio-app {
  --sidebar-width-expanded: 342px;
  --sidebar-width-collapsed: 68px;
  --sidebar-width: var(--sidebar-width-expanded);
  --mobile-bottom-nav-height: 72px;
  --mobile-bottom-nav-space: calc(var(--mobile-bottom-nav-height) + 18px);
}

.studio-app.sidebar-is-collapsed {
  --sidebar-width: var(--sidebar-width-collapsed);
}
```

**Why:** later composer/detail/gallery mobile stages need a reliable shell spacing contract.

---

### Change B — mobile main content reserves bottom nav + composer space

**File:** `src/styles/layers/mobile.css`

Change mobile variables from:

```css
--mobile-composer-space: 158px;
```

to a shell-aware model:

```css
--mobile-bottom-nav-height: 72px;
--mobile-bottom-nav-space: calc(var(--mobile-bottom-nav-height) + 18px);
--mobile-composer-space: 158px;
```

Then update `.studio-main` mobile padding:

```css
padding-bottom: calc(
  var(--mobile-composer-space) +
  var(--mobile-bottom-nav-space) +
  env(safe-area-inset-bottom)
);
```

For batch mode where the composer dock is not shown:

```css
.batch-composer-is-open .studio-main {
  padding-bottom: calc(var(--mobile-bottom-nav-space) + 18px + env(safe-area-inset-bottom));
}
```

**Why:** content must remain scrollable and not hidden behind the fixed bottom nav/composer.

---

### Change C — move mobile composer dock above bottom navigation

**File:** `src/features/composer/ComposerLayout.module.css`

Change mobile dock bottom from:

```css
bottom: 12px;
```

to:

```css
bottom: calc(var(--mobile-bottom-nav-space, 90px) + 8px);
```

**Why:** Stage 4 will redesign the composer as a bottom sheet, but Stage 2 must not introduce an overlap regression.

---

### Change D — mobile bottom navigation CSS

**File:** `src/features/workspace/StudioSidebar.module.css`

Add:

```css
.mobileBottomNav {
  position: fixed;
  left: var(--mobile-page-gutter, 12px);
  right: var(--mobile-page-gutter, 12px);
  bottom: max(8px, env(safe-area-inset-bottom));
  z-index: 86;
  display: none;
  min-height: var(--mobile-bottom-nav-height, 72px);
  border: 1px solid var(--line-strong);
  border-radius: 24px;
  padding: 6px;
  background: var(--surface-floating);
  backdrop-filter: var(--surface-blur-strong);
}

.mobileBottomTabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
}

.mobileMenuButton { ... }

@media (max-width: 860px) {
  .mobileBottomNav { display: grid; grid-template-columns: minmax(0, 1fr) 44px; }
}
```

**Why:** mobile navigation becomes a stable shell primitive instead of a floating drawer trigger.

---

## Files to modify

Expected modified files:

```txt
src/interface/context/workspace/tabs.ts
src/interface/primitives/WorkspaceTabButton.tsx
src/shared/ui/NavigationButton/NavigationButton.tsx
src/shared/ui/NavigationButton/NavigationButton.module.css
src/features/workspace/StudioSidebar.tsx
src/features/workspace/StudioSidebar.module.css
src/features/workspace/sections/sidebar/definition.ts
src/styles/layers/app-shell.css
src/styles/layers/mobile.css
src/features/composer/ComposerLayout.module.css
docs/UI_STRUCTURAL_REDESIGN_PLAN.md
```

Expected added files:

```txt
docs/UI_STRUCTURAL_REDESIGN_STAGE_02_PREFLIGHT.md
```

Expected deleted files:

```txt
none
```

No deletion is planned because removing the mobile drawer now would break screenshot runner assumptions and would prematurely erase a potentially useful secondary mobile menu. It will be reconsidered after Stage 4 when composer/mobile sheets are redesigned.

---

## What intentionally does not change in Stage 2

- Gallery cards are not converted into `ImageWall` yet.
- Composer is not rebuilt into compact/expanded/bottom-sheet states yet.
- Detail page is not rebuilt into artwork stage + inspector yet.
- Settings are not rebuilt into object editor yet.
- Batch composer internals are not redesigned yet.
- Provider, storage, generation and batch runner logic are untouched.
- Slot placement IDs stay stable.

---

## Debt and architecture assessment

### Potential debt: two mobile navigation paths

Adding bottom nav while keeping drawer can create ambiguity.

**Decision:** bottom nav is primary because it carries `data-workspace-navigation` and visible tab actions. Drawer is secondary because it is hidden behind a menu button and mainly preserves existing affordances/screenshots.

### Potential debt: shell spacing scattered across CSS files

Mobile nav affects app shell, composer and pages.

**Decision:** define shell spacing variables in app/mobile layers and consume those variables from composer CSS. Do not hard-code the nav height repeatedly.

### Potential debt: `StudioSidebar` becoming misnamed

The component will become a navigation shell, not only a sidebar.

**Decision:** do not rename during Stage 2 because placement definitions and imports would churn for little benefit. Update definition label only. If a later stage needs deeper shell split, rename in a dedicated refactor.

### Potential debt: mobile bottom nav as shared primitive vs feature CSS

A generic `BottomNavigation` shared primitive could be added, but that would be premature with only one consumer.

**Decision:** keep bottom nav CSS inside workspace navigation feature for now. If another feature needs it later, extract a shared primitive.

---

## Required checks after implementation

Static checks:

```txt
npm run verify:static
npm run build
```

Targeted checks if full static verification is too heavy:

```txt
npm run arch:check:strict
npm run interface:check
npm run css:check
npm run ui:check
npm run debt:check
npm test
npm run build
```

Visual checks:

```txt
npm run capture:screenshots -- --viewports=desktop,mobile --scenarios=gallery,sidebar-collapsed,settings-api,detail,batch-composer --out=artifacts/stage-02-visual
```

Manual visual review must verify:

- desktop expanded rail still works;
- desktop collapsed rail still centers icons;
- mobile has visible bottom navigation;
- mobile direct tab switching works without opening drawer;
- mobile drawer still opens/closes from the menu button;
- mobile content scroll is not blocked;
- mobile composer no longer sits on top of bottom navigation;
- batch mode reserves enough bottom space for the nav.
