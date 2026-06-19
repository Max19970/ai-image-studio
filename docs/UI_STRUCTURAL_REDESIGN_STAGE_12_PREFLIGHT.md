# UI Structural Redesign — Stage 12 Preflight

## Goal
Finish the structural redesign with a full architecture/debt audit rather than another visual redesign pass.

## Audit scope
- Architecture boundaries and import direction.
- Interface registry health and stale slot/definition leftovers.
- CSS/motion/accessibility/debt budgets.
- Provider, params, task lifecycle and storage architecture checks.
- Obsolete UI primitives and old transitional hooks left by the redesign.
- Final desktop/mobile screenshot baseline.

## Expected fixes
Do not make cosmetic changes unless the audit reveals a concrete issue. Prefer small cleanup patches that reduce code surface area and preserve the current architecture.

## Planned commands
- `npm run release:check`
- `node scripts/check-screenshot-artifacts.mjs` for the final screenshot set
- targeted `rg` audits for old inspector, native select and target/reference UI leftovers

## Risk analysis
The risky part of a final cleanup is over-refactoring stable UI code. The audit should therefore only remove unused pieces proven by search/build/tests and avoid changing runtime logic.
