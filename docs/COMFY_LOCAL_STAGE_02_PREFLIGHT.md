# ComfyUI Local Generation — Stage 02 Preflight

Date: 2026-06-19
Stage: Provider-owned generation surface

## Goal

Move the generation-parameter workbench away from direct `ParameterPanel -> logical ImageParams registry` coupling and introduce a provider-owned surface layer that can later host ComfyUI parameters without expanding the shared `ImageParams` model for every provider-specific option.

## Current-state observations

- `ParameterPanel` rendered the shared logical parameter tabs directly through `generationParamTabs`, `generationParamTabsById`, `renderGenerationParamSlot`, and hidden-param helpers.
- OpenAI-compatible payloads were built directly from `buildOpenAiCompatibleParamPayload` inside the OpenAI request adapter.
- Request snapshots only had a shared `params` bucket and no provider-owned parameter snapshot channel.
- Restoring a generation request called the logical OpenAI-compatible restore path directly.
- The existing registry already supports logical parameter plugins, so the correct move is not to replace it with a generic mega-form renderer.

## Simulated changes

- Add a provider parameter state bucket to `ImageParams`:
  - `providerParams?: Record<string, Record<string, unknown>>`
- Add provider state helpers:
  - state key resolution
  - safe bucket normalization
  - read/write helpers for nested provider params
- Add two surface layers:
  - request-safe surface for payload/snapshot/restore code
  - UI surface for `ParameterPanel` rendering
- Keep OpenAI-compatible params as the first surface implementation, internally backed by the existing logical registry.
- Let snapshots carry optional provider-owned metadata:
  - `surfaceId`
  - `providerParams`
  - `parameterSummary`
- Keep the old OpenAI visual/functional behavior unchanged.

## Debt gate

- Avoid importing UI/React/CSS-driven param registry into domain/process/server-adjacent request code.
- Avoid circular imports between provider registry, provider definitions, and generation surfaces.
- Do not convert all existing param fields to a generic schema renderer.
- Do not add ComfyUI-specific fields yet.
- Keep OpenAI-compatible request adapter behavior stable.

## Expected checks

- `npm run params:check`
- `npm run providers:check`
- `npm test`
- `npm run build`
- `npm run verify:static`
- Targeted visual capture for `parameters` and `detail` after changing the parameter workbench.
