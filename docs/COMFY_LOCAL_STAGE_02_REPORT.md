# ComfyUI Local Generation — Stage 02 Report

Date: 2026-06-19
Stage: Provider-owned generation surface

## Completed

- Added provider parameter state support to `ImageParams` through a single extension bucket:
  - `providerParams?: Record<string, Record<string, unknown>>`
- Added `src/entities/generation-params/providerState.ts`:
  - safe plain-record checks
  - provider/surface state key resolution
  - bucket normalization
  - read/write helpers for provider-owned state
- Added request-safe generation surface layer:
  - `src/entities/generation-params/requestSurface.ts`
  - `ProviderGenerationRequestSurface`
  - OpenAI-compatible request surface implementation
- Added UI generation surface layer:
  - `src/entities/generation-params/surfaceTypes.ts`
  - `src/entities/generation-params/openAiCompatibleSurface.tsx`
  - `src/entities/generation-params/surfaceRegistry.ts`
- Refactored `ParameterPanel` to ask the active provider surface for:
  - tabs
  - initial tab
  - tab stats
  - hidden-parameter summary
  - rendered field nodes
- Updated OpenAI-compatible request adapter to build payloads through the request surface facade.
- Updated request snapshot capture to record:
  - `surfaceId`
  - optional `providerParams`
  - optional `parameterSummary`
- Updated request restore to use `getProviderGenerationRequestSurfaceById(snapshot.surfaceId)`.
- Updated persisted generation task sanitization to preserve surface metadata.
- Updated detail sent-parameter extraction to prefer provider-owned `parameterSummary` when present, while falling back to payload inspection for existing OpenAI-compatible snapshots.

## Architecture notes

The implementation deliberately keeps request-safe and UI surfaces separate.

Reason: the UI surface depends on `renderGenerationParamSlot`, which uses Vite `import.meta.glob` and field modules with CSS imports. Pulling that into domain/process/server-adjacent request code caused Node test/runtime hazards and would have created provider-definition cycles. The final layout is:

- request/build/snapshot/restore path uses `requestSurface.ts` only;
- parameter modal UI uses `surfaceRegistry.ts` and `openAiCompatibleSurface.tsx`;
- the barrel export does not force request tests to import UI surfaces.

This preserves the stage goal while keeping Node tests and provider adapters clean.

## Checks

Passed:

```txt
npm run params:check
npm run providers:check
npm test
npm run build
npm run verify:static
```

`npm test` result: 61 passed, 0 failed.

Targeted visual capture passed:

```txt
npm run capture:screenshots -- --viewports=desktop,mobile --scenarios=parameters,detail --out=artifacts/stage02-visual
```

Result: 4 completed, 0 failed.

The Chromium container policy was temporarily restored after screenshot capture.

## Visual review

Checked generated screenshots:

- `artifacts/stage02-visual/desktop-parameters.png`
- `artifacts/stage02-visual/mobile-parameters.png`
- `artifacts/stage02-visual/desktop-detail.png`
- `artifacts/stage02-visual/mobile-detail.png`

No visible regression was found in the parameter modal/detail scenarios.

## Definition of Done

- New provider parameters can be added through a provider-owned surface instead of adding top-level fields to `ImageParams`.
- Existing OpenAI-compatible parameters remain backed by the logical parameter registry.
- OpenAI-compatible behavior remains stable.
- Static checks, tests, build, and targeted screenshots pass.
