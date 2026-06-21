# ComfyUI Optional Workflow Plugins Implementation Plan

**Intent:** Add optional ComfyUI workflow add-ons that can be enabled from generation parameters without hard-coding one-off provider logic across central UI or request code.
**Current Behavior:** The ComfyUI provider builds fixed text-to-image and Hires Fix graphs with optional LoRA conditioning only.
**Expected Outcome:** ComfyUI requests can opt into Tiled Generation, Tiled VAE Encode/Decode, PerturbedAttentionGuidance and PerpNegGuider through provider-owned generation parameters.
**Target-Perspective Output:** In the Parameters modal, a ComfyUI user can enable the add-ons, tune their compact settings, submit a request, and inspect the detail payload/summary.
**Truth Owner:** `src/entities/generation-params/comfyui/state.ts` owns client ComfyUI parameter state. `server/providers/comfyui/workflowTemplates.ts` owns server workflow generation. `server/providers/comfyui/workflowExtensions.ts` owns model/conditioning graph extensions.
**Contract Boundary:** Client sends stable provider-owned payload fields. Server normalizes those keys into workflow plugin config and emits ComfyUI prompt JSON nodes.
**Cutover:** Existing ComfyUI requests remain unchanged when all add-ons are disabled.
**Displaced Path:** No duplicate ComfyUI provider or alternate generation runner is added.
**Value Density:** Highest value slice is server graph support plus visible parameters and tests for each add-on.
**Acceptance Evidence:** Unit tests show generated workflow JSON contains the requested node classes and rejects incompatible combinations; `npm run build` passes.
**Evidence Lane:** Server workflow tests, generation surface/payload tests, build/static checks, optional visual QA.
**Kill Criteria:** If an add-on requires a duplicate ComfyUI runner or silently ignores an enabled option, stop and redesign. If PerpNegGuider and Tiled Generation cannot be represented together without a deprecated workaround, reject that combination explicitly.
**Architecture Slice:** Provider-owned generation state, ComfyUI payload extensions, server workflow extension points, workflow template branching, i18n parameter labels, targeted tests.
**Plan Review Gate:** Self-review required before execution and before final report.

## Research Notes

- `PerturbedAttentionGuidance` is a model patch node that accepts `model` and `scale` and outputs `MODEL`.
- `VAEDecodeTiled` and `VAEEncodeTiled` are core ComfyUI experimental nodes with tile size and overlap inputs.
- `BNK_TiledKSampler` is the custom node class used by BlenderNeko's Tiled KSampler extension. In Image Studio it is one selectable Tiled Generation backend and replaces the sampler node.
- `ComfyUI_TiledDiffusion` exposes `TiledDiffusion` as a model patch node. In Image Studio it is the second selectable Tiled Generation backend and keeps the sampler path available.
- `PerpNegGuider` outputs a `GUIDER`, so it must use the advanced custom sampling path: `RandomNoise`, `KSamplerSelect`, `BasicScheduler`, `SamplerCustomAdvanced`.

## Task Board

### [x] Stage 1 — Protocol setup and isolated branch

No product code changes. DevSpace opened, clean main verified, separate worktree and branch created.

### [x] Stage 2 — Source research and architecture map

No product code changes. Verified ComfyUI node contracts and current Image Studio extension points.

### [x] Stage 3 — Plan documents

Add this plan and a compact GOAL handoff.

### [x] Stage 4 — Client ComfyUI parameter state, UI and payload

Extend ComfyUI provider-owned state with optional add-on fields; add compact parameters UI extension; add payload/summary extension; add EN/RU i18n labels. Tiled Generation includes backend-specific settings for `BNK_TiledKSampler` and `ComfyUI_TiledDiffusion`.

Architecture check: use the existing ComfyUI surface extension registry and payload registry. Do not add central ImageParams fields for provider-specific options.

Allowed files:
- `src/entities/generation-params/comfyui/state.ts`
- `src/entities/generation-params/comfyui/ComfyUiSurfaceFields.tsx`
- `src/entities/generation-params/comfyui/extensions/*`
- `src/shared/i18n/locales/en/params.json`
- `src/shared/i18n/locales/ru/params.json`

### [x] Stage 5 — Server workflow normalization and graph generation

Normalize plugin payloads on the server; add PAG as model-conditioning extension; switch sampler graph to `BNK_TiledKSampler` when Tiled Generation is enabled; switch to advanced sampler graph when PerpNegGuider is enabled; use tiled VAE encode/decode nodes when enabled; reject Tiled Generation plus PerpNegGuider together.

Architecture check: keep all changes inside ComfyUI adapter/workflow ownership. Avoid deprecated PerpNeg. Avoid silent option precedence.

Allowed files:
- `server/providers/comfyui/workflowTemplates.ts`
- `server/providers/comfyui/workflowExtensions.ts`
- `server/providers/comfyui/workflowExtensionTypes.ts` only if needed

### [x] Stage 6 — Tests

Add targeted tests for client payload/snapshot behavior and server workflow graph branches.

Allowed files:
- `tests/comfyui-server-adapter.test.ts`
- `tests/generation-surface.test.ts`

### [x] Stage 7 — Static/build/visual verification

Run targeted tests and `npm run build`. Attempt visual screenshot scenario `parameters` if available; report honestly if blocked. Evidence captured: `npm test` passed 145/145 and `npm run build` passed. Visual screenshots remain blocked in this environment because Chromium is unavailable.

### [x] Stage 8 — Final review and Telegram handoff

Review diffs, update checklist, send final summary to Telegram before the chat final response.

## Non-goals

- Installing ComfyUI custom nodes locally.
- Adding live object_info probing for optional plugin availability.
- Supporting PerpNegGuider together with Tiled Generation through deprecated PerpNeg.
- Reworking the full ComfyUI graph builder architecture beyond the smallest extension needed for this feature.

## Risks

- `BNK_TiledKSampler` is a custom node and will fail in ComfyUI if the extension is not installed.
- `ComfyUI_TiledDiffusion` is a separate custom node extension and will fail in ComfyUI if it is not installed.
- PerpNegGuider requires advanced custom sampling nodes to be available in ComfyUI.
- Tiled VAE encode only affects workflows that encode an input image, currently Hires Fix.
- Too many controls in the service tab can become visually noisy; the UI must stay compact and grouped.
