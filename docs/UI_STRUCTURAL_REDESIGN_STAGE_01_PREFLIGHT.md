# UI Structural Redesign — Stage 1 preflight

Status: planned before code changes, 2026-06-18.
Stage: 1 — UI principles, density and surface system.

This document is the required simulation pass before implementation. It describes the intended code changes, architecture impact, refactoring needed before feature work, and the debt checks that must stay green.

---

## Stage goal

Create a small, explicit UI vocabulary that future redesign stages can reuse instead of creating more ad-hoc glass cards, nested panels and one-off CSS blocks.

Stage 1 must not redesign Gallery, Settings, Detail or Composer deeply. It prepares the primitives and tokens for those stages.

---

## Current problem in code

The codebase already has reusable primitives:

- `src/shared/ui/Card`
- `src/shared/ui/Panel`
- `src/shared/ui/Button`
- `src/shared/ui/IconButton`
- `src/shared/ui/FloatingPopover`
- `src/shared/ui/PopoverSelect`

But the visual language is still under-specified:

- `Card` and `Panel` are both glass containers with borders, blur and shadows, so they encourage wrapping everything in card-like surfaces.
- Global surface classes in `src/styles/layers/app-primitives.css` (`.glass-panel`, `.detail-card`, `.inspector-group`, `.control-card`, strips) encode semantic layout and visual surface at the same time.
- There is no first-class primitive for adult interaction patterns needed by the redesign:
  - command bar;
  - side inspector;
  - bottom sheet;
  - compact entity list.
- Density exists only as local CSS choices, not as reusable control/page semantics.

---

## Planned refactoring before feature work

### Refactor A — introduce surface/density tokens before adding primitives

**Why:** without tokens every new primitive would hard-code its own glass/border/shadow values, recreating the same slop in a cleaner folder.

**File:** `src/styles/layers/base.css`

**Planned change:** extend `:root` with semantic tokens derived from existing theme variables.

Will add tokens like:

```css
--surface-app: var(--bg);
--surface-workspace: rgba(255,255,255,.035);
--surface-floating: rgba(18,18,19,.92);
--surface-inspector: rgba(12,12,13,.58);
--surface-field: var(--field);
--surface-danger: rgba(255,154,169,.10);
--surface-debug: rgba(7,7,8,.68);

--surface-border: var(--line);
--surface-border-strong: var(--line-strong);
--surface-shadow-soft: 0 18px 48px rgba(0,0,0,.16);
--surface-shadow-floating: 0 28px 90px rgba(0,0,0,.38);
--surface-blur-soft: blur(18px) saturate(120%);
--surface-blur-strong: blur(28px) saturate(135%);

--density-comfortable-gap: 16px;
--density-compact-gap: 8px;
--control-height-compact: 32px;
--control-height-touch: 44px;
```

**Architecture risk:** token bloat.

**Mitigation:** tokens are semantic and limited to surfaces/density only. No page-specific tokens like `--gallery-card-bg` in global CSS.

---

### Refactor B — make existing `Card` and `Panel` less prescriptive

**Why:** currently `Card` and `Panel` both visually invite “wrap this thing in a glass slab”. Stage 1 should keep backwards compatibility but make their semantics clearer.

**Files:**

- `src/shared/ui/Card/Card.tsx`
- `src/shared/ui/Card/Card.module.css`
- `src/shared/ui/Panel/Panel.tsx`
- `src/shared/ui/Panel/Panel.module.css`

**Planned change:**

`Card`:

```ts
interface CardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  as?: 'article' | 'section' | 'div';
  interactive?: boolean;
  surface?: 'object' | 'flat' | 'ghost';
}
```

- default stays compatible: object card;
- `flat` becomes a quieter object surface;
- `ghost` becomes a non-glass wrapper for future page-level redesign.

`Panel`:

```ts
interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: 'none' | 'tight' | 'comfortable';
  surface?: 'workspace' | 'floating' | 'inspector' | 'debug';
}
```

- default remains compatible but uses tokens;
- new variants prevent future ad-hoc panel CSS.

**Architecture risk:** changing primitives could unexpectedly alter current pages.

**Mitigation:** default props preserve existing usage and page-level layouts are not migrated yet.

---

## Planned new primitives

All new primitives live in `src/shared/ui`. They must depend only on React and shared UI/CSS modules. They must not import app, feature, interface, entity, domain, process, provider or infrastructure code.

### Primitive 1 — `CommandBar`

**Files to add:**

```txt
src/shared/ui/CommandBar/CommandBar.tsx
src/shared/ui/CommandBar/CommandBar.module.css
src/shared/ui/CommandBar/index.ts
```

**Planned API:**

```ts
interface CommandBarProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  as?: 'div' | 'header' | 'nav' | 'section';
  density?: 'comfortable' | 'compact' | 'touch';
  align?: 'start' | 'center' | 'between' | 'end';
  wrap?: boolean;
}
```

**Why:** future Gallery/Settings/Detail controls should use a compact command surface instead of a card-like header strip.

**Debt risk:** becoming another generic layout div.

**Mitigation:** only owns action-row layout and density, not page-specific content.

---

### Primitive 2 — `SideInspector`

**Files to add:**

```txt
src/shared/ui/SideInspector/SideInspector.tsx
src/shared/ui/SideInspector/SideInspector.module.css
src/shared/ui/SideInspector/index.ts
```

**Planned API:**

```ts
interface SideInspectorProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  density?: 'comfortable' | 'compact';
  sticky?: boolean;
}
```

**Why:** Detail/Gallery/Settings need a desktop inspector pattern instead of secondary card stacks.

**Debt risk:** feature-specific inspector logic could drift into shared.

**Mitigation:** primitive owns only shell/spacing/header. No knowledge of generations, providers, images or settings.

---

### Primitive 3 — `BottomSheet`

**Files to add:**

```txt
src/shared/ui/BottomSheet/BottomSheet.tsx
src/shared/ui/BottomSheet/BottomSheet.module.css
src/shared/ui/BottomSheet/index.ts
```

**Planned API:**

```ts
interface BottomSheetProps {
  open: boolean;
  children: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  size?: 'content' | 'half' | 'full';
  closeOnBackdrop?: boolean;
  onClose: () => void;
}
```

**Why:** mobile redesign stages need sheets for composer, filters, params and actions. Without a shared primitive every feature will make its own modal-ish CSS.

**Debt risk:** accessibility/modal complexity.

**Mitigation:** implement Escape close, backdrop close, `role="dialog"`, `aria-modal="true"`, labelled title id, portal rendering, no business logic.

---

### Primitive 4 — `EntityList`

**Files to add:**

```txt
src/shared/ui/EntityList/EntityList.tsx
src/shared/ui/EntityList/EntityList.module.css
src/shared/ui/EntityList/index.ts
```

**Planned API:**

```ts
interface EntityListProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  density?: 'comfortable' | 'compact' | 'touch';
}

interface EntityListItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  selected?: boolean;
}
```

**Why:** Settings, future Gallery filters and batch queues need compact selectable rows instead of full cards.

**Debt risk:** over-generalization.

**Mitigation:** keep it to selectable rows only. No editing forms, no provider-specific rendering.

---

## Shared export update

**File:** `src/shared/ui/index.ts`

**Planned change:** export the new primitives and their prop types.

```ts
export { CommandBar } from './CommandBar';
export type { CommandBarProps } from './CommandBar';
export { SideInspector } from './SideInspector';
export type { SideInspectorProps } from './SideInspector';
export { BottomSheet } from './BottomSheet';
export type { BottomSheetProps } from './BottomSheet';
export { EntityList, EntityListItem } from './EntityList';
export type { EntityListProps, EntityListItemProps } from './EntityList';
```

---

## Plan document update

**File:** `docs/UI_STRUCTURAL_REDESIGN_PLAN.md`

**Planned change:**

- mark Stage 1 as `[~]` before implementation and `[x]` after passing checks;
- add an execution protocol section requiring preflight simulation before every stage;
- check Stage 1 checklist items after implementation.

---

## Files not to delete

No source files should be deleted in Stage 1.

Reason: existing pages still depend on current primitives and CSS classes. Removing old primitives before page-level migrations would create churn without UX value.

---

## What will not be changed in Stage 1

- No business logic.
- No generation/request/storage behavior.
- No page-level Gallery redesign yet.
- No Settings split-view rewrite yet.
- No Composer bottom-sheet behavior wired yet.
- No Detail page stage/inspector rewrite yet.

---

## Validation plan

Required after implementation:

```bash
npm run build
npm run ui:check
npm run css:check
npm run debt:check
```

Optional but useful if time allows:

```bash
npm run arch:check:strict
npm run interface:check
```

Manual visual expectation for Stage 1:

- existing screens should not radically change yet;
- shared primitive changes should be subtle;
- future stages should now have proper non-card primitives available.
