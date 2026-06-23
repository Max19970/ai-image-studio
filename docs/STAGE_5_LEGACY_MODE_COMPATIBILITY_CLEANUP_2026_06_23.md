# Stage 5 — Legacy mode compatibility cleanup

Date: 2026-06-23  
Branch: `fix/architecture-audit-2026-06-22`

## Goal

Reduce direct UI dependence on the old global `WorkMode` / `legacyWorkMode` compatibility vocabulary without deleting compatibility needed for existing snapshots, presets, and OpenAI-compatible transport parity.

## Usage classification

### Intentionally retained compatibility

- `src/domain/workMode.ts` and `GenerationRequestSnapshot.mode` remain for old saved task snapshots, request presets, and historical detail/restore flows.
- `ProviderGenerationModeDefinition.legacyWorkMode` remains as a temporary mapping from old `generate` / `edit` snapshots and OpenAI-compatible payload contracts into provider-owned modes.
- `src/entities/provider/modeResolution.ts` still owns legacy fallback mode creation for adapters that have not declared `generationModes` yet. This is a compatibility bridge for future provider migration, not the target UI source of truth.
- OpenAI-compatible request payload and submit adapter code still accepts `mode: WorkMode` to preserve legacy generate/edit parity while provider mode transport becomes the long-term path.
- Parameter availability/profile code still accepts `mode: WorkMode` because the logical parameter registry has not yet been fully converted to provider-mode-owned rules.

### Moved away from legacy checks

- Composer prompt placeholder intent no longer checks `providerMode.legacyWorkMode !== 'edit'` directly.
- Batch draft prompt placeholder intent no longer checks `providerMode.legacyWorkMode !== 'edit'` directly.
- Composer submit aria label no longer checks `providerMode.legacyWorkMode !== 'edit'` directly.

These now use provider-mode UI intent helpers derived from submit transport and attachment policy.

## New helper ownership

`src/entities/provider/modeIntent.ts` owns UI-facing provider mode intent helpers:

- generate-like/edit-like intent;
- prompt placeholder keys;
- submit action label key;
- attachment requirement summary.

`src/entities/provider/modeResolution.ts` now exposes `resolveProviderGenerationModeForRestore(...)` so restore behavior explicitly prefers stored `providerModeId` and falls back to legacy snapshot mode only when needed.

## Long-term source of truth

The target contract is:

```txt
provider mode + attachment policy + submit transport
```

`WorkMode` and `legacyWorkMode` are compatibility vocabulary only. They should not be used for new UI intent checks or new provider behavior decisions unless the code is explicitly bridging old snapshots/presets or legacy OpenAI-compatible payload contracts.
