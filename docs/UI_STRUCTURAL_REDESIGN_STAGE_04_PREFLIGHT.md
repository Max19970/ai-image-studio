# UI Structural Redesign — Stage 4 preflight

Stage: **4 — Composer → command dock + attachment tray**  
Date: 2026-06-18  
Status: simulation accepted for implementation

---

## Current code reality

The composer is currently built from stable interface slots:

- `composer/attachments` → `ComposerAttachmentsSection`
- `composer/input` → `ComposerPromptSection`
- `composer/actions` → `ComposerActionsSection`
- `composer/status` → `ComposerStatusSection`
- `composer/tools` → mode/assets/batch/parameters actions

The main shell component is `src/features/composer/ImageComposer.tsx`. It owns file input refs, popover state, attachment preview conversion and layout context. Most layout styling lives in `src/features/composer/ComposerLayout.module.css`.

The current UI already has useful modular boundaries, so the stage must not replace the slot system with ad-hoc JSX. The redesign should change the composer interaction model while preserving the registry/placement architecture.

---

## Problem to solve

The dock still behaves like a small dashboard panel:

- attachments render above the prompt as a separate visual block;
- the action row has model/tool/send controls as a second heavy row;
- mobile is a squeezed version of the same dock, not an intentional sheet-like composer;
- prompt is important, but it competes visually with the controls around it;
- there is no explicit compact/expanded state, so secondary tools are always visible at the same priority.

---

## Target UX

### Desktop

Default state becomes a compact command dock:

```txt
[prompt input........................................] [model] [tools] [send]
```

Expanded state reveals the secondary surface below:

```txt
[prompt input........................................] [model] [tools] [send]
[ attachment tray ] [ status / edit requirement ]
```

The expanded area is not a new card. It is a low-height tray attached to the command dock.

### Mobile

The composer becomes a sheet-like bottom command surface:

- compact state: prompt + send + one row of compact controls;
- expanded state: sheet grows upward, exposes attachments/status, and keeps the prompt usable;
- it stays above mobile bottom navigation;
- it does not block page scroll with accidental full-screen overlays unless explicitly expanded.

---

## Exact planned code changes

### 1. `src/features/composer/composerTypes.ts`

Add composer expansion state to `ComposerLayoutContext`:

```ts
expanded: boolean;
attachmentsCount: number;
actions: {
  ...existingActions,
  setExpanded: (expanded: boolean) => void;
  toggleExpanded: () => void;
}
```

Why: expansion must be part of layout context because sections decide whether to render secondary UI. It should not be inferred inside CSS or duplicated across sections.

Risk: exposing expansion through context could become a general state sink. Mitigation: only add composer UI state; do not add business logic or storage state.

### 2. `src/features/composer/ImageComposer.tsx`

Add local state:

```ts
const [expanded, setExpanded] = useState(false);
```

Add derived flags:

```ts
const hasSecondaryContent = attachments.length > 0 || Boolean(statusText) || (mode === 'edit' && !targetImage);
const revealSecondary = expanded || hasSecondaryContent;
```

Pass `expanded`, `attachmentsCount`, `setExpanded`, `toggleExpanded` to `composerLayoutContext`.

Change render shape from:

```tsx
<section className={styles.dock}>
  <SlotHost slot="composer/attachments" />
  <div className={styles.main}>
    <SlotHost slot="composer/input" />
    <SlotHost slot="composer/actions" />
  </div>
  <SlotHost slot="composer/status" />
</section>
```

To:

```tsx
<section className={cx(styles.dock, revealSecondary && styles.expanded)}>
  <div className={styles.commandSurface}>
    <div className={styles.promptRail}>
      <SlotHost slot="composer/input" />
      <SlotHost slot="composer/actions" />
    </div>
  </div>
  <div className={styles.secondarySurface} hidden={!revealSecondary}>
    <SlotHost slot="composer/attachments" />
    <SlotHost slot="composer/status" />
  </div>
</section>
```

Why: primary command and secondary tray become explicit. The slot architecture remains intact.

Risk: `hidden` with slots can remove mounted attachment preview modal. Acceptable, because secondary content is only hidden when no content is present and not expanded.

### 3. `src/features/composer/sections/actions/ComposerActionsSection.tsx`

Keep hidden file inputs in this section.

Add an expand/collapse button next to tools:

```tsx
<button data-testid="composer-expand" ...>
  {context.expanded ? '⌄' : '⌃'}
</button>
```

Use localized labels:

- `composer.expand`
- `composer.collapse`
- `composer.expandHint`

Keep model select, tool slots and submit button in the same section.

Why: the actions section owns command controls and already has access to layout context.

Risk: adding a raw button could bypass design primitives. Mitigation: style it with composer-scoped command control styles and test coarse pointer sizes.

### 4. `src/features/composer/sections/attachments/ComposerAttachmentsSection.tsx`

Change section styling from `attachmentStrip` to `attachmentTray`.

Set strip size based on state:

```tsx
size={context.expanded ? 'regular' : 'compact'}
```

Why: attachments should feel like a tray, not an independent card. When auto-revealed from existing files, compact mode avoids visual weight.

### 5. `src/features/composer/sections/status/ComposerStatusSection.tsx`

Keep behavior, but move visual treatment into tray-like status note.

No business logic changes.

### 6. `src/features/composer/ComposerLayout.module.css`

Refactor composer styles into clearer conceptual sections:

- dock position/frame;
- command surface;
- prompt rail;
- prompt input;
- actions/model/tools/send;
- secondary surface/tray;
- mobile sheet behavior.

Replace `.main` with `.commandSurface` and `.promptRail`.

Add:

- `.expanded`
- `.secondarySurface`
- `.expandButton`
- `.attachmentTray`

Mobile behavior:

```css
@media (max-width: 620px) {
  .dock { border-radius: 24px 24px 18px 18px; }
  .expanded { max-height: min(78dvh, 620px); overflow: auto; }
  .promptRail { grid-template-columns: 1fr auto; }
}
```

Risk: `ComposerLayout.module.css` is already large. If CSS grows too much or `debt:check` complains, split status/tray/action CSS into owner modules before continuing. Do not raise budgets.

### 7. `src/features/composer/ui/ComposerPopover.module.css`

Make popover choices more command-menu-like:

- less card-like background per item;
- stronger row layout;
- less decorative borders;
- clearer active state.

No TS changes.

### 8. `src/shared/i18n/locales/{ru,en}/composer.json`

Add keys:

```json
"composer.expand": "Раскрыть composer",
"composer.collapse": "Свернуть composer",
"composer.expandHint": "Вложения и статус"
```

English equivalents.

### 9. `scripts/screenshot.config.mjs`

Add visual scenario:

```js
{
  name: 'composer-expanded',
  steps: [
    { type: 'click', selector: '[data-testid="composer-expand"]' },
    { type: 'wait', ms: 220 },
    { type: 'screenshot' }
  ]
}
```

Why: Stage 4 needs direct visual QA of expanded composer state.

### 10. `docs/UI_STRUCTURAL_REDESIGN_PLAN.md`

Mark Stage 4 as completed only after implementation and verification.

---

## Required refactoring before implementation

### Refactor A — make composer expansion explicit in context

Do this before UI styling. It prevents sections from guessing state independently and avoids future ad-hoc `window.innerWidth`/CSS-only state hacks.

### Refactor B — keep secondary composer content behind a single slot area

Do not scatter attachments/status around `ImageComposer`. Use one secondary tray area, then keep existing slots inside it. This protects placement architecture.

### Refactor C — avoid a new shared primitive for this stage

A generic `ComposerDock` primitive would be premature: the behavior is composer-specific and depends on file inputs, prompt state, mode and generation actions. Keep it feature-owned for now. Generalize later only if another feature needs the same pattern.

---

## Technical debt assessment

This stage improves architecture if it keeps the slot contract and moves the UI toward explicit primary/secondary surfaces.

It would create debt if:

- expansion state is duplicated in individual sections;
- mobile gets separate copied JSX instead of CSS-driven behavior over the same slot structure;
- attachments are reimplemented instead of reusing `AttachmentImageStrip`;
- file input flows are moved outside their current command owner;
- CSS grows by random patches rather than being reorganized by composer concepts.

Planned mitigation:

- use one `expanded` state in `ImageComposer`;
- keep slot ids stable;
- reuse `AttachmentImageStrip`;
- do not touch generation/storage/provider/batch logic;
- run `debt:check`, `css:check`, `ui:check` and visual screenshots.

---

## Verification plan

Static:

- `npm run verify:static`
- if needed, individual checks for faster debugging:
  - `npm run build`
  - `npm run css:check`
  - `npm run ui:check`
  - `npm run debt:check`

Visual:

- `gallery`
- `composer-expanded`
- `parameters`
- `batch-composer`
- `detail`
- `settings-api`

Viewports:

- desktop
- mobile

Screenshot runner may require the Chromium policy workaround from `chatgpt_project_screenshot_guide.txt`; policy must be restored after screenshots.

---

## Implementation correction after visual smoke

The first implementation treated any `statusText` as secondary content and therefore auto-expanded the composer in seeded screenshots, because the app can have a non-critical ready status like “Done — received images”. This made mobile compact mode too tall.

Correction applied:

- auto-reveal secondary composer surface only for attachments or actionable edit warning;
- keep routine status text inside the expanded surface instead of forcing expansion;
- hide mobile tool cluster in compact state using `data-composer-expanded='false'`, not CSS-module `:not(.expanded)` selector;
- update `composer-edit-status` screenshot scenario to expand the composer before selecting edit mode, because mode/tools are intentionally hidden in compact mobile state.

This keeps the compact mobile composer closer to a command trigger, while expanded mode remains available for mode/assets/batch/params/status.
