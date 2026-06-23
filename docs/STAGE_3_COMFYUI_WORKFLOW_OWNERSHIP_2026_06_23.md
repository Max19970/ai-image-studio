# Stage 3 — ComfyUI workflow/plugin ownership

Date: 2026-06-23  
Branch: `fix/architecture-audit-2026-06-22`

## Goal

Normalize the ComfyUI workflow/plugin layer after the 2026-06-22 architecture audit:

- remove the workflow extension import cycle;
- split the oversized `workflowTemplates.ts` ownership;
- keep actual generation behavior stable;
- add coverage for `UI state -> request payload -> server config -> workflow nodes`.

## New ownership boundaries

`server/providers/comfyui/workflowTypes.ts`

- Payload input types.
- Resolved server config types.
- Workflow graph/node structural types.
- Neutral type owner for modules that should not import workflow builders.

`server/providers/comfyui/workflowConfig.ts`

- Server-authoritative payload normalization.
- Numeric clamps and defaults.
- LoRA input normalization.
- Hires Fix config resolution.
- Calls plugin compatibility validation after resolving plugin config.

`server/providers/comfyui/workflowPluginValidation.ts`

- Server-authoritative workflow plugin compatibility rules.
- Currently owns the `PerpNegGuider + BNK_TiledKSampler` rejection.

`server/providers/comfyui/workflowExtensionTypes.ts`

- Node refs and node allocator.
- Workflow extension build context.
- Model/clip conditioning extension contracts.
- Shared resolved graph refs used by sampler and VAE builder modules.

`server/providers/comfyui/workflowExtensions.ts`

- Model-conditioning extensions only:
  - PAG model patch;
  - LoRA stack;
  - ComfyUI_TiledDiffusion model patch and SpotDiffusion params.

`server/providers/comfyui/workflowSamplerNodes.ts`

- Sampler strategy node ownership:
  - `KSampler`;
  - `BNK_TiledKSampler`;
  - `PerpNegGuider` + `SamplerCustomAdvanced` path.

`server/providers/comfyui/workflowBaseGraph.ts`

- Base text-to-image graph wiring:
  - checkpoint loader;
  - conditioning text encoders;
  - empty latent;
  - VAE encode/decode helpers;
  - save image;
  - text-to-image workflow builder.

`server/providers/comfyui/workflowHiresFix.ts`

- Hires Fix workflow graph ownership:
  - input image load;
  - latent upscale path;
  - AI upscale path;
  - refinement sampler path through shared sampler builder.

`server/providers/comfyui/workflowTemplates.ts`

- Compatibility facade only.
- Re-exports config resolvers, workflow builders, and public workflow types for existing imports.

## Client/server flow checked

The new `tests/comfyui-workflow-contract.test.ts` covers:

1. Client ComfyUI UI state stored in `providerParams.comfyui`.
2. Client payload creation through `buildComfyUiPayload()`.
3. Server config resolution through `resolveComfyUiGenerationConfig()`.
4. Workflow graph creation through `buildComfyUiTextToImageWorkflow()`.
5. Node assertions for:
   - Tiled Diffusion;
   - SpotDiffusion params;
   - LoRA loader;
   - PerpNegGuider;
   - Tiled VAE decode;
   - BNK_TiledKSampler.
6. Backend name mapping:
   - UI `tiledDiffusion` -> payload/server `tiled_diffusion`;
   - UI `bnkTiledKSampler` -> payload/server `bnk_tiled_ksampler`;
   - UI `randomStrict` -> payload/server `random strict`.
7. Server-side rejection of incompatible `PerpNegGuider + BNK_TiledKSampler` payloads.

## Guardrail updates

`npm run providers:check` now understands the split server ComfyUI workflow modules and checks node ownership across builder files instead of requiring all node names to live in `workflowTemplates.ts`.

## Remaining duplication / future manifest work

Some ComfyUI semantics are still duplicated and should move toward a shared provider-owned schema/manifest later:

- client state/defaults/clamps in `src/entities/generation-params/comfyui/state.ts`;
- client payload name mapping in `src/entities/generation-params/comfyui/extensions/workflowPluginsPayloadExtension.ts`;
- server payload normalization/clamps in `server/providers/comfyui/workflowConfig.ts`;
- UI labels/help/compatibility text in ComfyUI surface field modules;
- server plugin compatibility validation in `workflowPluginValidation.ts`.

This stage deliberately did not introduce a shared manifest because that would be a broader client/server contract migration. The added contract test is the interim guardrail against drift.

## Verification

Passed:

- `npm run imports:check`
- `npm run providers:check`
- `node --import tsx --test tests/comfyui-workflow-contract.test.ts`
- `npm test`
- `npm run build`

Partial:

- `npm run verify:static` reaches `debt:check` and fails on pre-existing non-ComfyUI growth-cap debt listed in the architecture audit. The ComfyUI import cycle, provider check, task check, tests and build all pass before that point.
