# UI Structural Redesign — Stage 7.1 Preflight

## Goal
Bring the selected request editor in Batch Composer closer to the normal Composer interaction model. A batch item is not a separate form pattern: it is the same request composition flow repeated inside a queue.

## Problem
Stage 7 improved the macro-layout of Batch Composer, but the selected request editor still looks like a bespoke form:

- separate visible mode pills;
- separate target / refs / mask / params toolbar;
- duplicated request header inside an already selected editor;
- old source/reference language leaking into the request authoring UI.

This creates UX drift from the main Composer and increases future maintenance risk: every composer simplification would have to be re-invented inside Batch Composer.

## Simulated implementation

### 1. Keep the Stage 7 queue workbench
No change to the queue rail or batch-level footer. The queue/timeline model remains the correct macro-layout.

### 2. Change selected draft editor composition
Modify `BatchDraftCardSection.tsx` from:

```tsx
<header />
<mode pills />
<prompt />
<attachments />
<toolbar />
```

to a composer-like surface:

```tsx
<article className={styles.draftCard}>
  <div className={styles.commandSurface}>
    <attachments />
    <div className={styles.promptRail}>
      <controls />
      <prompt />
    </div>
  </div>
</article>
```

### 3. Replace draft toolbar with a controls menu
Rewrite `BatchDraftToolbarSection.tsx` to match the normal composer controls pattern:

- one `⋯` trigger;
- desktop: `FloatingPopover`;
- mobile: `BottomSheet`;
- mode switch inside menu;
- model select inside menu;
- actions inside menu:
  - add images;
  - add/replace mask;
  - clear mask;
  - generation parameters;
  - duplicate request;
  - remove request;
  - clear attachments.

### 4. Flatten visible attachment semantics
Do not show target/reference buttons in the batch request editor. Existing `BatchComposerDraft` internals can still carry `targetImage/referenceImages/mask` for compatibility, but new regular images are added as a flat image bucket via `referenceImages`, while `mask` remains a separate advanced control.

### 5. Adjust prompt styling
Make `BatchDraftPromptSection` visually closer to the normal composer input:

- compact rounded prompt field;
- mobile compact one-line behavior;
- long prompt scrolls inside textarea instead of expanding the editor weirdly.

### 6. Remove unused draft-header/mode placements
The selected editor header already communicates the current request and readiness. Keeping a second internal header and visible mode row would preserve the old bespoke-form feel.

## Refactoring / debt analysis

### Needed supporting refactor
Update `BatchDraftLayoutContext` from target/reference-oriented file inputs to composer-like inputs:

```ts
fileInputs: {
  attachments: RefObject<HTMLInputElement | null>;
  mask: RefObject<HTMLInputElement | null>;
}
```

and rename `addReferences` to `addAttachments`.

### Why this is not technical debt
- The queue model remains batch-owned.
- No feature-to-feature import from normal Composer is introduced.
- We intentionally duplicate only the small menu implementation, not the whole Composer feature, because importing Composer into Batch Composer would violate feature ownership and create cross-feature coupling.
- Old persisted/batch draft internals remain compatible.
- The UI semantics now align with the main Composer, reducing future UX drift.

## Validation
- `npm run build`
- `npm run verify:static`
- visual screenshots:
  - desktop batch composer;
  - mobile batch composer;
  - mobile batch composer scrolled.
