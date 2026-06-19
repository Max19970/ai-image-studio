# UI Structural Redesign — Stage 7 Preflight

## Stage
Stage 7 — Batch composer → queue/timeline workbench.

## Current problem
The batch composer still renders every request as a full editable card. This scales poorly: the user sees many repeated mode/prompt/attachment/model controls, while the real mental model should be a queue with one selected item being edited.

## Intended UX
Desktop:

```txt
Header
Controls / queue stats
┌ queue list ┐ ┌ selected request editor ┐
│ request 1  │ │ full request controls   │
│ request 2  │ │ prompt/model/assets/... │
│ request 3  │ │ params/actions          │
└────────────┘ └─────────────────────────┘
Footer actions
```

Mobile:

```txt
Header
Controls
Queue list
Selected request editor
Fixed footer
```

This is not a behavior rewrite. It is a UI restructuring of the existing draft editing flow.

## Planned code changes

### 1. `src/features/batch-composer/MultiImageComposer.tsx`
- Add local `selectedDraftId` state.
- Keep it synchronized when drafts are added/removed.
- Add `selectedDraftId` and `selectDraft(id)` to `BatchComposerLayoutContext`.
- Fix derived `validDrafts` to match the real batch runner rule: edit drafts are valid if they have target image, reference images or a mask.

### 2. `src/features/batch-composer/batchComposerTypes.ts`
- Add:
  - `selectedDraftId: string | null`;
  - `selectedDraftIndex: number`;
  - `selectDraft(id: string): void`.

### 3. `src/features/batch-composer/sections/draft-list/BatchDraftListSection.tsx`
- Replace the full-card list with a workbench:
  - left/top compact queue list;
  - right/below selected draft editor.
- Reuse the existing `batch-composer/draft/card` slot only for the selected draft.
- Render compact queue rows inline in this section instead of creating another slot layer.

### 4. `src/features/batch-composer/sections/draft-list/BatchDraftListSection.module.css`
- Add workbench, queue rail/list/row and selected inspector styles.
- Desktop uses a split layout.
- Mobile stacks queue list then selected editor.

### 5. `src/features/batch-composer/sections/draft-card/BatchDraftCardSection.module.css`
- Lighten the selected editor so it feels like an editor/inspector, not one of many heavyweight cards.

### 6. `src/features/batch-composer/sections/controls/BatchComposerControlsSection.*`
- Keep behavior, but make controls more compact and queue-oriented.
- Keep interval wording as “between sends”.

### 7. `src/shared/i18n/locales/{ru,en}/batch.json`
- Add labels for queue rows and selected editor.

### 8. Roadmap
- Mark Stage 7 complete and keep visual caveats if screenshot coverage cannot synthesize active/error runtime states.

## Architecture / debt analysis
- No batch runner behavior changes.
- No provider/storage changes.
- No new placement contract needed; existing draft slots remain stable.
- The key refactor is semantic: many editable cards → queue list + selected editor.
- Avoid creating duplicate mobile JSX; use the same markup with responsive CSS.
- Avoid adding runtime status simulation into production code. Visual active/error states should be handled through screenshot fixtures later if needed.

## Risks
- Removing per-card editing could make it less obvious which request is being edited. Mitigation: selected queue row + selected editor title.
- Draft removal may leave no selected item. Mitigation: selected id sync in `MultiImageComposer`.
- Existing tests are mostly architecture/domain-level; visual screenshot is still required for UX sanity.

## Validation plan
- `npm run build`
- `npm run verify:static`
- screenshots: `batch-composer` desktop/mobile
- manually inspect that selected request editor and queue rows are visible and usable.
