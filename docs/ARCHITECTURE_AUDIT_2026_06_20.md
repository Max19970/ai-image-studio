# Architecture Audit — 2026-06-20

Status: audit artifact. No runtime code or UI fixes were made in this branch.

Worktree: `C:\Users\maxsh\.devspace\worktrees\image-studio-58256f30`  
Branch: `audit/krypton-architecture-2026-06-20`

## Outcome contract

**Intent:** verify the actual Image Studio architecture through DevSpace and Krypton-style ownership, contract, cutover, and evidence checks.

**Current behavior:** the docs describe a strong modular baseline, but the clean worktree does not fully reproduce the runnable/checkable project state.

**Expected outcome:** a prioritized architecture audit grounded in code and command evidence.

**Truth owner:** tracked repository files plus reproducible checks. Ignored local files in the main checkout are not a safe source of truth for future agents or fresh clones.

**Contract boundary:** read-only audit plus this Markdown report. No implementation changes.

**Cutover rule:** future fixes should remove or redirect the old path instead of leaving duplicate hidden truth owners.

**Acceptance evidence:** listed command results and inspected source paths below.

**Non-goals:** no visual QA, no live provider QA, no merge, no push, no cleanup.

## Checklist

- [x] Read project protocol and Krypton planning/execution skills.
- [x] Create isolated DevSpace worktree/branch.
- [x] Inspect architecture docs, source layout, package scripts, and key boundaries.
- [x] Run available static checks.
- [x] Rank findings by architectural risk.
- [x] Record audit artifact.

## Verdict

The codebase is not architectural chaos. The main modularization held: `app` is mostly wiring, `interface` has real Definition/Placement composition, provider/task/storage/CSS/motion/UI checks exist, import cycles are clean, and batch requests are prepared per draft with their own provider context.

But the current tracked repo is not clean-worktree reproducible. That is the biggest finding. Two guard rails are also already firing: one hard debt-budget failure and one ComfyUI parameter-surface warning.

## Findings

### P0/P1 — Clean worktree is missing required source data

`src/data/studio.defaults.json` and `src/data/interface-themes.json` exist in the main checkout but are ignored and untracked. A clean worktree does not contain them, while code and checks import them.

Evidence:

- `.gitignore` contains broad `data/` ignore.
- `src/domain/defaults.ts` imports `../data/studio.defaults.json`.
- `src/features/settings/themePreview.ts` imports `../../data/interface-themes.json`.
- `npm run verify:static` failed at `params:check` with missing `src/data/studio.defaults.json`.
- In the main checkout, both `src/data` JSON files are ignored.
- In the audit worktree, `git ls-files src/data` is empty and `src/data` is absent.

Truth owner now: hidden ignored local files.  
Correct truth owner: tracked source config or tracked TypeScript defaults.

Cutover:

1. Narrow `.gitignore` from `data/` to `/data/` or another explicit runtime-local path.
2. Track `src/data/studio.defaults.json` and `src/data/interface-themes.json`, or move their contents into tracked TS modules.
3. Re-run from a fresh worktree.

Acceptance evidence:

- Fresh worktree contains the source defaults.
- `npm run params:check` passes.
- `npm run build` passes.
- `npm run verify:static` no longer stops on missing source data.

### P1 — Debt budget fails on generation task storage routes

`server/routes/generationTaskStorageRoutes.ts` grew past its calibrated cap.

Evidence:

- `npm run debt:check` failed on `server/routes/generationTaskStorageRoutes.ts`: reported 162 lines, limit 110.
- Direct audit count was 161 lines.
- The file owns diagnostics, audit, history load, asset load, asset download, temporary download creation, temporary download serving, save, and clear routes.

Cutover:

- Split into smaller route/handler modules, for example history, asset, and download route clusters.
- Keep the current file as a thin registrar only.

Acceptance evidence:

- `npm run debt:check` passes.
- Existing storage/download tests pass once dependencies are available in the worktree.

### P1/P2 — `src/domain` is not fully pure

The architecture docs describe `domain` as stable pure contracts/helpers, but current domain files import upward into entities and contain browser/runtime behavior.

Evidence:

- `src/domain/generationSnapshots.ts` imports from `../entities/studio-settings`.
- `src/domain/generationSnapshots.ts` imports from `../entities/generation-params/requestSurface`.
- `src/domain/requestBuilder.ts` re-exports from `../entities/provider/request` and appears unused.
- `generationSnapshots.ts` creates browser object URLs while summarizing files.

Cutover:

1. Move snapshot capture to a process/entity boundary.
2. Keep domain as pure types/contracts and runtime-free helpers.
3. Move preview URL creation to a browser/shared-image or UI/process boundary.
4. Remove unused `src/domain/requestBuilder.ts` if no longer needed.
5. Add a `no-domain-upward-imports` architecture rule if this boundary is intended to be strict.

Acceptance evidence:

- No `src/domain` imports upward into entities, providers, processes, infrastructure, interface, features, or app unless explicitly allowed and documented.
- `npm run arch:check:strict` includes the new rule and passes.
- `npm run imports:check` still reports zero cycles.

### P2 — Provider extensibility still has central switches

Provider behavior is mostly adapter-owned, but adding another provider still requires central provider-specific edits.

Evidence:

- `src/entities/generation-params/requestSurface.ts` switches on `provider.adapterId === 'comfyui'`.
- Client and server provider registries explicitly import OpenAI-compatible and ComfyUI adapters.
- `scripts/check-provider-adapters.mjs` hardcodes current provider module lists.

Cutover before the next major provider:

1. Let provider definitions expose their request surface directly.
2. Make provider checks iterate registered adapter manifests instead of hardcoded provider names.
3. Keep central registries as thin composition/discovery points only.

Acceptance evidence:

- Adding a mock provider requires adding provider files/manifest, not editing request-surface switch logic.
- Provider checks validate every registered adapter through a shared contract.

### P2 — Batch aggregate snapshot can misrepresent mixed batches

Per-item batch preparation is good, but the top-level batch request still stores params from the first prepared item.

Evidence:

- `src/processes/batch-runner/requestBuilder.ts` sets aggregate `params` from `prepared[0].snapshot.params`.
- `src/features/detail/sections/snapshot/DetailSnapshotSections.tsx` renders retry policy from `task.request.params`; batch details call this same status block.
- `tests/batch-mixed-providers.test.ts` covers per-item provider/model isolation, but aggregate semantics are still first-item-shaped.

Cutover:

1. Give batch aggregate request its own batch-shaped summary contract.
2. Show provider/model/retry/params per item, not as a fake global batch value.
3. Add a test for mixed retry policies and mixed providers in batch detail/snapshot data.

Acceptance evidence:

- A mixed batch no longer reports the first item’s retry policy as the whole batch policy.
- Existing mixed-provider test still passes.

### P2/P3 — Server routes import integration definitions from `src/entities`

`server/routes/integrationRoutes.ts` imports integration definitions from the client `src` tree. This is currently small and Telegram-only, but it can become awkward as integrations grow.

Cutover options:

- Move integration contracts to a neutral server-safe shared/domain module.
- Or make the server own integration definitions and expose them through `/api/integrations`.

Acceptance evidence:

- Server code no longer casually imports from client feature/entity trees, or the shared path is explicitly documented and checked.

## Strong areas to preserve

- `npm run interface:check` passed: 52 definitions, 56 placements, 38 slots, 6 reusable definitions used by multiple placements.
- `npm run imports:check` passed: 505 internal source files scanned, 0 cycles.
- `npm run arch:check:strict` passed the current architecture rules.
- `npm run providers:check`, `tasks:check`, `storage:check`, `css:check`, `motion:check`, and `ui:check` passed before the debt budget failure stopped the combined command.
- Batch request preparation uses `draft.selectedModelId` and resolves provider context per item, which is the right direction for mixed-provider batch generation.

## Command evidence

Main checkout before audit:

```txt
## main...origin/main
 M .gitignore
?? .codex/
```

The main checkout was not modified by this audit.

`npm run verify:static`:

- passed `arch:check:strict`;
- passed `imports:check`;
- passed `interface:check`;
- failed at `params:check` because `src/data/studio.defaults.json` is missing in the clean worktree.

Focused checks:

- passed: `providers:check`, `tasks:check`, `storage:check`, `css:check`, `motion:check`, `ui:check`, `secrets:check`, `imports:check`;
- failed: `debt:check`.

`npm test`:

- not usable as behavioral evidence in this worktree yet;
- it failed before meaningful assertions because the managed worktree did not have the `tsx` dependency available.

## Recommended execution order

1. Fix source-data reproducibility.
2. Re-run full static/test/build from a fresh worktree.
3. Split `generationTaskStorageRoutes.ts` to close the hard debt failure.
4. Split `ComfyUiGenerationSurface.tsx` to remove the warning and reduce future LoRA/workflow friction.
5. Add and satisfy a strict domain-boundary rule.
6. Normalize provider extensibility before adding more providers.
7. Correct batch aggregate snapshot semantics.

## Final gate review

Correctness: P0 source-data drift blocks reliable release confidence.

Maintainability: architecture is mostly healthy, but route growth and ComfyUI surface growth should not be ignored because the project already has budgets for them.

Ownership: provider/task/storage ownership is mostly good; domain purity, integration definitions, and provider request-surface ownership need clearer contracts.

Evidence: this audit used code/static evidence only. No visual QA and no live provider QA were performed because no UI/runtime behavior was changed.
