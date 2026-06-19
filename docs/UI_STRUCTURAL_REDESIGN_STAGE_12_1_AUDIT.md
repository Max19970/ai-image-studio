# UI Structural Redesign — Stage 12.1 Audit

## Scope
Manual visual QA found 14 remaining UI issues after the final redesign pass. This stage fixes those issues without changing generation, storage, provider adapters, task lifecycle, or batch runner logic.

## Architecture impact
The changes stay within feature-owned UI layers:

- Gallery: empty state, header actions, search/filter chrome, quick action trigger.
- Workspace shell: desktop sidebar spacing.
- Settings: field info popover surface and model editor cleanup.
- Info: current-tense guide text and removal of redundant status/settings action UI.
- Detail: duplicated image-stage status removal, topbar spacing, request-first batch detail grouping.
- Batch composer: selected editor sizing, mobile header framing, prompt auto-grow.
- Composer: prompt auto-grow and prompt/action layout.
- Shared UI: bottom sheet safe-area padding.

No new cross-feature dependencies were introduced. The inactive gallery history UI definition and feature flag were removed because the action is no longer part of the product surface.

## Fixes

1. Empty gallery now uses a compact centered state.
2. Desktop sidebar tabs have stronger spacing.
3. Gallery search/filter command bar no longer has an unnecessary extra outline.
4. Settings info popovers use a floating surface with border/background/shadow.
5. Redundant model settings bottom cards were removed.
6. Gallery quick actions trigger uses an SVG three-dots icon.
7. Info page removed redundant settings/status actions and uses current product documentation wording.
8. Detail image stage no longer shows duplicated status; topbar spacing improved.
9. Batch detail inspector is grouped by request first.
10. Batch selected editor no longer stretches with queue height.
11. Bottom sheets reserve extra safe bottom padding.
12. Composer and batch prompt fields auto-grow to several lines and use modest rounded corners.
13. Gallery History action removed from active UI and registry surface.
14. Mobile batch header is a proper framed topbar.

## Validation

- `npm run release:check` passed.
- `npm run verify:static` passed as part of release check.
- `npm run debt:check:strict` passed.
- `npm run storage:audit:strict` passed.
- Tests: 42/42 passed.
- Visual screenshots: 22 PNGs including empty gallery and long-prompt composer states.

## Known non-blocking note
Vite still reports the existing chunk-size advisory. This is not a failing release gate and should be handled as a future code-splitting task if needed.
