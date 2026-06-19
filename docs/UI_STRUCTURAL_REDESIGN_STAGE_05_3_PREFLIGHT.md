# UI Structural Redesign — Stage 5.3 Preflight

## Goal
Fix three post-Stage-5 polish issues without starting the next large redesign stage:

1. Long prompts break the mobile one-line composer visual shape.
2. Gallery quick actions menu opens, but "open details" and "delete" do not reliably execute while download works.
3. Mobile bottom navigation still contains a drawer/menu trigger even though primary navigation already lives in the bottom nav.

Info/settings mobile layouts are intentionally left untouched. They belong to later roadmap stages.

## Planned changes

### 1. Mobile composer long prompt containment
Affected files:
- `src/features/composer/sections/prompt/ComposerPromptSection.tsx`
- `src/features/composer/ComposerLayout.module.css`

Change:
- Keep mobile compact prompt height capped to the command-bar height instead of letting the textarea grow into a large pill.
- Allow textarea internal scrolling for long prompts.
- Keep attachments above the prompt; do not move attachments into controls.

Debt check:
- No new mobile-only component.
- No duplicated composer logic.
- This is a layout-contract correction for the existing mobile composer mode.

### 2. Gallery quick actions execution order
Affected file:
- `src/features/gallery/sections/quick-actions/GalleryQuickActionsSection.tsx`

Change:
- Replace parent `onClickCapture={onAction}` with bubble-phase closing after child actions run.
- Execute `open details` before closing the menu.
- Keep download/delete definitions in existing slots.

Debt check:
- No command duplication.
- Existing action definitions stay reusable through placements.

### 3. Remove mobile sidebar drawer trigger
Affected files:
- `src/features/workspace/StudioSidebar.tsx`
- `src/features/workspace/StudioSidebar.module.css`
- `scripts/screenshot.config.mjs`

Change:
- Remove mobile drawer component/state from runtime.
- Bottom navigation becomes the only mobile navigation surface.
- Make bottom nav horizontally scrollable, matching the intended mobile model.
- Make the old visual scenario tolerant of missing mobile drawer trigger.

Debt check:
- This removes a competing mobile navigation pattern instead of styling around it.
- No changes to desktop rail.
