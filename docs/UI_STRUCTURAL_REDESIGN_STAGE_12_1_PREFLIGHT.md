# UI Structural Redesign — Stage 12.1 Preflight

## Goal
Close the final manual visual QA findings without changing generation, storage, provider, or batch-runner behavior.

## Scope
This sweep addresses concrete UI defects found during manual testing:

1. Empty gallery composition is too scattered.
2. Desktop sidebar tabs need clearer spacing.
3. Gallery search/filter grouping has an unnecessary extra outline.
4. Settings info popovers need a real floating surface.
5. Model settings contain redundant bottom summary/action blocks.
6. Gallery quick-actions trigger should be a real dots icon.
7. Info page should not include redundant settings/status actions and should read as current product documentation.
8. Detail image stage duplicates status; detail topbar is too tight.
9. Batch detail inspector should group data primarily by request.
10. Batch selected editor should not stretch with queue height.
11. Mobile bottom sheets need safe bottom padding.
12. Composer and batch prompt fields should grow up to several lines and use modest rounded corners.
13. Gallery header should not show the unexplained History button.
14. Mobile batch header needs cleaner framing and title placement.

## Architecture notes
- Keep changes feature-owned: gallery fixes stay in gallery, composer in composer, batch in batch, settings in settings, detail in detail.
- No domain/request/provider/storage state changes.
- No new cross-feature dependency.
- Prefer CSS/layout corrections and small JSX cleanup over new primitives.
- Reuse existing slots and shared components.

## Validation plan
- `npm run build`
- `npm run verify:static`
- visual screenshot pass for desktop/mobile core scenarios.
