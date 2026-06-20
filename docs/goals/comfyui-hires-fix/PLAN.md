# Provider-Owned Generation Modes + ComfyUI Hires Fix Implementation Plan

**Intent:** Replace the app-level `generate | edit` mode model with provider-owned generation modes, then add ComfyUI Hires Fix as one of those modes. Each provider defines its own modes, attachment policy, parameter surface, payload contract, transport, snapshot rows, and detail-page summary.

**Current Behavior:** Image Studio has a global `WorkMode = 'generate' | 'edit'`. OpenAI-compatible providers use both. ComfyUI currently supports only text-to-image generation, hides attachments, forces mode back to `generate`, and exposes one provider-owned parameter/detail surface. This makes Hires Fix awkward: it needs one image input, but it is not the same thing as global `edit`.

**Expected Outcome:** There is no user-facing global generate/edit mode. The selected provider/model resolves a list of provider-owned modes. OpenAI-compatible providers expose their own modes such as `image-generate` and `image-edit`. ComfyUI exposes modes such as `text-to-image` and `hires-fix`. The active provider mode decides which parameters are visible, which attachments are allowed/required, how payload is built, which server transport is used, and which request details appear later.

**Target-Perspective Output:** Max chooses a provider/model, then chooses one of that provider’s actual modes. For OpenAI-compatible providers this still feels like Generate/Edit, but it is owned by the provider. For ComfyUI, Max can choose Text to Image or Hires Fix; Hires Fix allows exactly one attached image and shows Latent Upscale / AI Upscale settings. The details page shows mode-specific request details instead of global-mode leftovers.

**Truth Owner:** Provider adapter definitions own supported generation modes. Provider-owned generation/request surfaces own mode-specific params, payload, snapshot summary, restoration, and validation. Composer, batch, runners, and detail pages consume provider mode contracts and must not hardcode global generate/edit logic.

**Contract Boundary:** UI works with `providerModeId` and `ProviderGenerationModeDefinition`. Runners submit `{ provider, providerMode, params, payload, attachments }`. Client request adapters convert that into JSON or multipart proxy requests. Server provider adapters submit by provider mode, not by global `fetchGenerate`/`fetchEdit` split.

**Cutover:** Introduce provider-owned modes as a compatibility layer first, map the old OpenAI generate/edit behavior into OpenAI-owned modes, then demote/remove global `WorkMode` from UI state, drafts, request snapshots, and provider request contracts. After cutover, any remaining transport operation is an internal property of provider mode, not a user-facing mode.

**Displaced Path:** Displace the global `WorkMode` truth path. Displace composer/batch/detail assumptions that mode is one of `generate | edit`. Displace ComfyUI’s implicit “only text-to-image, never attachments” behavior with explicit ComfyUI mode definitions.

**Value Density:** This migration pays off immediately because Hires Fix becomes a normal provider mode, and future ComfyUI modes—img2img, inpaint, pure upscale, controlnet, custom workflow presets—can be added without rewriting global app logic.

**Acceptance Evidence:** Unit tests prove provider mode resolution, OpenAI-compatible mode parity, ComfyUI Hires Fix payload/workflow/resources, compatibility sanitization, batch independence, snapshots, and details. `npm run build` must pass. Visual QA must show parameters, composer attachment behavior, batch composer, and detail page on desktop/mobile.

**Evidence Lane:** Contract tests first, then provider-specific tests, then build/static checks, then visual screenshots. Manual ComfyUI runtime smoke is required only if a local ComfyUI server with an upscale model is available; otherwise mark runtime as unproven.

**Kill Criteria:** No new global `hires-fix` mode. No UI-level ComfyUI branches except through provider contracts. No routing Hires Fix through old global edit semantics. No hidden retained attachments after provider/mode changes. No duplicate details renderer bypassing provider summaries. No long-lived compatibility `mode` field as the dominant source of truth after migration stages finish.

**Architecture Slice:** `domain` request/draft/snapshot types, `entities/provider` adapter definitions and mode contracts, `entities/generation-params` provider surfaces, OpenAI-compatible and ComfyUI request adapters, server provider submit contracts, generation/batch runners, composer/batch UI, detail descriptors, ComfyUI resources/workflow templates, i18n, tests.

**Plan Review Gate:** Requires PRE review before execution.

---

## Read-Only Findings

- `src/domain/workMode.ts` currently defines only `'generate' | 'edit'`.
- `BatchComposerDraft`, `GenerationRequestSnapshot`, composer state, runner input, provider request adapters, and many UI controls currently depend on `WorkMode`.
- OpenAI-compatible providers are the only providers that naturally map to both current modes.
- ComfyUI currently has one provider-owned surface id: `comfyui.text-to-image`.
- ComfyUI currently hides image attachments through `controlSurface.showImageAttachments: false` and forces mode back to `generate` in composer/batch.
- `/api/generate` is JSON-only; `/api/edit` is multipart. Provider-owned Hires Fix needs multipart generation without pretending to be OpenAI edit.
- Detail pages already have a provider-owned `parameterSummary` path, which is the right place for mode-specific details.

---

## Architecture Map

### Files to create

- `src/domain/providerMode.ts` — provider mode ids, attachment policy, transport/submit semantics, and snapshot metadata types.
- `src/entities/provider/modeResolution.ts` — resolve modes/default mode/active mode for provider+model.
- `src/entities/generation-params/providerModeSurface.ts` — helper types for mode-specific parameter tabs/slots/summaries if needed.
- `src/entities/generation-params/comfyui/modes.ts` — ComfyUI Text to Image and Hires Fix mode definitions.
- `src/entities/generation-params/openai-compatible/modes.ts` — OpenAI-compatible Image Generate and Image Edit definitions.
- `server/providers/comfyui/imageUpload.ts` — upload one input image to ComfyUI `/upload/image`.
- `tests/provider-modes.test.ts` — provider mode resolution and compatibility.
- `tests/comfyui-hires-fix.test.ts` — Hires Fix payload/workflow/server coverage.

### Files to modify

- `src/domain/workMode.ts` — demote, deprecate, or delete after migration.
- `src/domain/generationTask.ts`
- `src/domain/imageParams.ts` only if temporary migration fields are needed; prefer draft-level `providerModeId`.
- `src/entities/provider/types.ts`
- `src/entities/provider/controlSurface.ts`
- `src/entities/provider/compatibility.ts`
- `src/entities/provider/request.ts`
- `src/entities/generation-params/surfaceTypes.ts`
- `src/entities/generation-params/requestSurfaceTypes.ts`
- `src/entities/generation-params/requestSurface.ts`
- `src/entities/generation-params/openai-compatible/**`
- `src/entities/generation-params/comfyui/**`
- `src/providers/openai-compatible/definition.ts`
- `src/providers/openai-compatible/requestAdapter.ts`
- `src/providers/comfyui/definition.ts`
- `src/providers/comfyui/requestAdapter.ts`
- `server/providers/types.ts`
- `server/providers/openai-compatible/adapter.ts`
- `server/providers/comfyui/adapter.ts`
- `server/routes/generationRoutes.ts`
- `server/providers/comfyui/resources.ts`
- `server/providers/comfyui/requestHandlers.ts`
- `server/providers/comfyui/workflowTemplates.ts`
- `src/app/workspace/**`
- `src/app/commands/**`
- `src/processes/generation-runner/**`
- `src/processes/batch-runner/**`
- `src/features/composer/**`
- `src/features/batch-composer/**`
- `src/features/detail/model/detailDescriptors.ts`
- `src/shared/i18n/locales/en/*.json`
- `src/shared/i18n/locales/ru/*.json`
- Relevant tests under `tests/`.

### Files to avoid

- Avoid page-level provider/mode branches.
- Avoid adding generic Hires Fix fields to logical OpenAI parameter registry.
- Avoid using `/api/edit` for ComfyUI Hires Fix.
- Avoid broad gallery/storage rewrites unless snapshot persistence tests require a small schema adjustment.

### Source of truth

- Provider definitions own `generationModes`.
- Active mode is stored in workspace/draft state as `providerModeId`, not inferred from attachments.
- Provider mode definitions own attachment policy and transport requirements.
- Provider generation surfaces own mode-specific parameter availability.
- Provider request surfaces own mode-specific payload/snapshot summaries.
- Server provider adapters own mode-specific upstream submission.

### Read path

Selected model → provider → provider modes → active provider mode → parameter surface tabs/fields → provider-owned state → payload builder → request snapshot/summary → detail descriptor.

### Write path

User changes provider mode → compatibility sanitizer applies mode attachment policy → parameter UI patches provider-owned state → submit builds mode-specific payload → client request adapter chooses proxy transport → server adapter submits mode-specific upstream request → response mapper stores raw response/workflow/history.

### Integration points

- Provider/model picker and mode picker.
- Parameter modal.
- Composer attachments and status text.
- Batch draft toolbar/card and request builder.
- Generation runner and cancellation/retry.
- Server proxy routes and provider adapters.
- Detail page metadata/parameter/runtime rows.
- Storage/snapshot compatibility for old tasks.

### Migration/cutover

- Old `mode: 'generate'` maps to default provider mode: OpenAI `image-generate`, ComfyUI `text-to-image`.
- Old `mode: 'edit'` maps to OpenAI-compatible `image-edit` only when the provider supports it.
- Existing saved snapshots still render because detail descriptors read legacy `mode` as fallback.
- New snapshots write `providerModeId`, `providerModeLabel`, and optionally `transportOperation`; legacy `mode` is omitted or marked compatibility-only after final cutover.

### Acceptance evidence gate

Feature is not complete until OpenAI-compatible generate/edit behavior remains equivalent, ComfyUI text-to-image still works, Hires Fix works through provider-owned mode, mixed batch requests remain independent, and visual QA confirms the UI did not become confusing.

---

## Decisions

1. **Provider modes replace global user-facing modes.** `generate/edit` becomes legacy compatibility vocabulary, not product architecture.
2. **Provider mode owns attachment policy.** Examples: OpenAI image edit allows target/reference/mask as supported; ComfyUI text-to-image allows none; ComfyUI Hires Fix requires exactly one target image.
3. **Provider mode owns submit transport.** Examples: OpenAI generate may use JSON; OpenAI edit uses multipart; ComfyUI text-to-image uses JSON; ComfyUI Hires Fix uses multipart generation.
4. **Provider mode owns parameter surface.** Parameter modal receives active provider mode and renders only relevant fields.
5. **Provider mode owns detail summary.** Detail page displays `providerModeLabel` and provider summary entries, not global mode labels.
6. **Hires Fix first slice remains prompt-driven refinement/upscale.** Pure upscale without prompt can become another ComfyUI provider mode later.
7. **ComfyUI Hires Fix supports exactly one input image in this slice.** Multi-image/control workflows are separate future modes.
8. **Current width/height are treated as target dimensions for Hires Fix.** If runtime testing proves this is poor UX, add a separate target-size/scale control before merge.

---

## Staged Checklist

### Stage 0 — Branch/worktree and baseline verification

Status: [x] done and verified

Intended code changes: none.

Architecture/debt evaluation: required because this is now a migration, not a small feature. Main checkout currently has unrelated dirty files, so implementation must stay in an isolated worktree.

Tasks:

- [x] Use a clean isolated worktree.
- [x] Create implementation branch `feature/provider-owned-generation-modes-hires-fix`.
- [x] Re-read AGENTS, protocol appendix, this plan, and relevant source files.
- [x] Run baseline checks or record blockers.

Verification:

- `git status --short`
- `npm run build`

Acceptance evidence:

- Clean implementation branch/worktree.
- Baseline known before migration.

Parallel: no.

---

### Stage 1 — Provider mode domain contract

Status: [x] done and verified

Intended code changes: introduce provider mode domain types and resolution helpers while leaving old `WorkMode` paths temporarily supported.

Architecture/debt evaluation: this is the necessary anti-spaghetti refactor. Without it, every future provider mode would become a special case in composer, batch, runner, and details.

Tasks:

- [x] Add `ProviderGenerationModeDefinition` with id, label/description keys, default flag, attachment policy, parameter surface id, detail surface id, and submit transport metadata.
- [x] Add `ProviderAttachmentPolicy`: allowed roles, max counts, required roles, clear-on-switch behavior.
- [x] Add provider mode resolver: list modes, get default mode, normalize selected mode, map legacy `WorkMode` to provider mode.
- [x] Extend provider adapter definitions with `generationModes`.
- [x] Keep a temporary adapter fallback for providers that do not define modes yet.

Verification:

- `npm run providers:check`
- `npm run build`

Acceptance evidence:

- Provider definitions can declare modes without composer knowing provider-specific details.
- Existing providers keep behavior through fallback or explicit modes.

Parallel: no.

---

### Stage 2 — OpenAI-compatible modes as provider-owned modes

Status: [x] done and verified

Intended code changes: move existing OpenAI-compatible Generate/Edit semantics into OpenAI provider mode definitions.

Architecture/debt evaluation: this proves provider-owned modes are not ComfyUI-only. If OpenAI remains hardwired to global modes, the migration is fake.

Tasks:

- [x] Define OpenAI-compatible `image-generate` mode.
- [x] Define OpenAI-compatible `image-edit` mode.
- [x] Move mode labels/descriptions from generic composer mode copy into provider mode copy.
- [x] Move attachment policy for edit into mode definition.
- [x] Update OpenAI-compatible request adapter to build payload based on provider mode.
- [x] Preserve exact old payload behavior.

Verification:

- Existing OpenAI provider tests.
- New provider mode parity tests for old generate/edit behavior.
- `npm run providers:check`
- `node --import tsx --test tests/provider-modes.test.ts`
- `npx tsc --noEmit`
- `npx vite build`

Acceptance evidence:

- User-visible OpenAI-compatible Generate/Edit still works, but no longer depends on global `WorkMode` as truth.

Parallel: after Stage 1 only.

---

### Stage 3 — Workspace, composer, and batch state migration

Status: [x] done and verified

Intended code changes: replace active `mode` state/draft field with `providerModeId`, while keeping legacy snapshot compatibility.

Architecture/debt evaluation: this is the riskiest migration stage because mono and batch must remain independent. Must use shared sanitizer helpers instead of duplicate mono/batch fixes.

Tasks:

- [x] Replace workspace active mode state with active `providerModeId`.
- [x] Replace `BatchComposerDraft.mode` with `providerModeId`.
- [x] On provider/model change, normalize mode to the selected provider’s default if current mode is unsupported.
- [x] Apply provider mode attachment policy on mode/provider changes.
- [x] Update composer mode picker to render provider mode definitions.
- [x] Update batch draft toolbar to render provider mode definitions per draft provider.
- [x] Update status text for missing required attachments based on active provider mode.

Verification:

- `npm run tasks:check`
- `npm test` with provider compatibility and batch mixed-provider tests.
- `npm run build`

Acceptance evidence:

- Batch drafts can use different providers and different provider modes independently.
- Switching modes clears or preserves attachments according to mode policy.

Parallel: no.

---

### Stage 4 — Generation params/request surfaces become mode-aware

Status: [x] done and verified

Intended code changes: pass active provider mode into parameter surfaces, request surfaces, payload builders, snapshot capture, and restore paths.

Architecture/debt evaluation: this keeps parameter visibility data-driven and prevents provider-specific UI branching.

Tasks:

- [x] Extend `ProviderGenerationSurfaceContext` with `providerMode`.
- [x] Extend `ProviderGenerationRequestSurfacePayloadContext` with `providerMode`.
- [x] Update logical OpenAI surface to filter params by OpenAI provider mode.
- [x] Update ComfyUI surface to receive active provider mode through the shared surface context.
- [x] Update request snapshot capture to store `providerModeId` and `providerModeLabel`.
- [x] Update restore from snapshot to select provider mode first, then restore params.

Verification:

- `npx tsc --noEmit`
- `npm run params:check`
- `npm run build`

Acceptance evidence:

- Parameter modal now receives active provider mode for single and batch requests.
- OpenAI-compatible logical params are filtered through provider-mode-aware availability.
- New snapshots store provider mode id/label/transport metadata while keeping legacy `mode` and surface restoration compatibility.
- Old snapshots remain viewable/restorable via compatibility mapping.

Parallel: after Stage 3.

---

### Stage 5 — Unified provider submit contract and proxy transport

Status: [x] done and verified

Intended code changes: demote server/client generate/edit split into provider-mode submit transport.

Architecture/debt evaluation: avoid letting the old `/api/generate` vs `/api/edit` split remain the real architecture. It may remain as implementation detail temporarily, but provider mode must select transport.

Tasks:

- [x] Introduce client-side submit proxy config based on provider mode.
- [x] Introduce server provider submit function that receives `providerModeId`, payload, files, and context.
- [x] Support JSON and multipart proxy submissions from provider mode transport metadata.
- [x] Preserve legacy `/api/generate` and `/api/edit` only as shims if needed during transition.
- [x] Prefer a single `/api/provider/submit` route if migration cost is reasonable; otherwise document route shims as temporary kill criteria.
- [x] Update OpenAI-compatible and ComfyUI server adapters to submit by provider mode.

Verification:

- Provider adapter contract tests.
- Route tests for JSON and multipart modes.
- `npm run providers:check`

Acceptance evidence:

- OpenAI generate/edit and ComfyUI text-to-image/Hires Fix select transport by provider mode, not global mode.

Parallel: after Stage 1; safest after Stage 3/4.

---

### Stage 6 — ComfyUI mode definitions and Hires Fix parameter UI

Status: [~] partially done

Intended code changes: define ComfyUI `text-to-image` and `hires-fix` provider modes. Add Hires Fix state and UI fields.

Architecture/debt evaluation: ComfyUI specifics stay inside ComfyUI modules. Generic composer and params modal only consume provider mode contracts.

Tasks:

- [x] Add ComfyUI `text-to-image` mode with no attachments.
- [ ] Add ComfyUI `hires-fix` mode with exactly one required target image.
- [ ] Extend ComfyUI param state: `hiresUpscaleMode: 'latent' | 'ai'`, `hiresUpscaleModel`.
- [ ] Add mode-specific tabs/fields.
- [ ] Add Latent Upscale / AI Upscale picker.
- [ ] Show AI upscaler model picker only for AI Upscale.
- [ ] Add RU/EN i18n for mode labels, descriptions, fields, status messages, detail rows.

Verification:

- `npm run params:check`
- `npm run build`

Acceptance evidence:

- ComfyUI Text to Image keeps existing user behavior.
- ComfyUI Hires Fix shows only relevant settings and requires one image.

Parallel: after Stage 4.

---

### Stage 7 — ComfyUI upscale model resources

Status: [ ] not started

Intended code changes: add live ComfyUI `upscale_models` resource kind and cache integration.

Architecture/debt evaluation: reuse existing resource cache; no one-off resource fetching inside Hires Fix field component.

Tasks:

- [ ] Add `upscale_models` to domain/server/client resource kinds.
- [ ] Fetch `/models/upscale_models`.
- [ ] Add fallback to `/object_info/UpscaleModelLoader`, input `model_name`.
- [ ] Refresh/cache upscale models with other ComfyUI resources.
- [ ] Feed Hires Fix AI model picker from cache plus current value fallback.

Verification:

- ComfyUI server adapter resource tests.
- `npm run providers:check`

Acceptance evidence:

- Fake ComfyUI server test proves upscaler models are discovered.
- UI can show cached upscale model options.

Parallel: can run after Stage 1 and before Stage 6 if interfaces are ready.

---

### Stage 8 — ComfyUI Hires Fix workflow and server implementation

Status: [ ] not started

Intended code changes: implement Hires Fix upload/workflow execution through ComfyUI provider mode.

Architecture/debt evaluation: workflow node graph belongs in `workflowTemplates`; request handler orchestrates upload/prompt/history only.

Tasks:

- [ ] Upload one target image to ComfyUI `/upload/image` as input.
- [ ] Add Hires Fix resolved config.
- [ ] Build Latent Upscale workflow: `LoadImage → VAEEncode → LatentUpscale → KSampler → VAEDecode → SaveImage`.
- [ ] Build AI Upscale workflow: `LoadImage → UpscaleModelLoader → ImageUpscaleWithModel → VAEEncode → KSampler → VAEDecode → SaveImage`.
- [ ] Preserve checkpoint, LoRA chain, CLIP encode, sampler, scheduler, denoise, seed, CFG, filename prefix.
- [ ] Include Hires Fix mode/upscale metadata in raw response.
- [ ] Validate missing/extra files with clear errors.

Verification:

- `tests/comfyui-hires-fix.test.ts`
- Existing ComfyUI text-to-image tests.

Acceptance evidence:

- Tests assert critical node class names and graph links.
- Existing ComfyUI text-to-image workflow still passes unchanged.

Parallel: after Stage 5/6 payload contract is stable.

---

### Stage 9 — Snapshots, detail page, storage compatibility

Status: [ ] not started

Intended code changes: update request snapshots/details to display provider mode and mode-specific parameter summaries.

Architecture/debt evaluation: detail page should remain descriptor-driven. Do not add Hires Fix-specific detail component unless generic descriptor contract is insufficient.

Tasks:

- [ ] Add `providerModeId` and `providerModeLabel` to `GenerationRequestSnapshot`.
- [ ] Keep legacy `mode` read support for old tasks.
- [ ] Update detail metadata rows to show provider mode.
- [ ] Add ComfyUI Hires Fix parameter summary entries.
- [ ] Ensure Hires Fix target image appears in attachments summary.
- [ ] Ensure restore/reuse from snapshot selects provider mode and parameters.

Verification:

- Snapshot/detail tests.
- `npm run build`

Acceptance evidence:

- Detail page for OpenAI generate/edit and ComfyUI text-to-image/Hires Fix shows correct mode-specific rows.

Parallel: after Stage 4 and Stage 6.

---

### Stage 10 — Final checks and visual QA

Status: [ ] not started

Intended code changes: only tests/scenario fixtures if needed.

Architecture/debt evaluation: because this is an architectural migration, passing build alone is not enough.

Tasks:

- [ ] Update provider adapter contract tests.
- [ ] Update provider control/compatibility tests.
- [ ] Update batch mixed-provider tests.
- [ ] Add Hires Fix workflow/resource tests.
- [ ] Run static checks.
- [ ] Run visual screenshots.
- [ ] Manually inspect screenshots.

Verification commands:

- `npm run providers:check`
- `npm run params:check`
- `npm run tasks:check`
- `npm test`
- `npm run build`
- `npm run capture:screenshots -- --viewports=desktop,mobile --scenarios=parameters,composer-attachments,batch-composer,detail --out=artifacts/verify-provider-modes-hires-fix`

Acceptance evidence:

- All relevant checks pass.
- Visual screenshots show provider-owned mode picker, mode-specific params, Hires Fix one-image behavior, batch independence, and detail rows.
- Manual ComfyUI smoke result is recorded if available; otherwise runtime is honestly marked unproven.

Parallel: no.

---

## Risks and Mitigations

### Risk: migration becomes too large and blocks Hires Fix

Mitigation: stages preserve compatibility. If necessary, stop after Stage 4 with provider-owned modes active in UI/contracts but legacy server route shims still present, then finish server submit unification in the same branch before Hires Fix.

### Risk: `providerModeId` stored outside params makes parameter modal restoration harder

Mitigation: snapshot stores provider mode explicitly. Draft/workspace state owns selected mode. Provider-owned params store only settings, not mode truth, unless provider needs nested sub-mode fields.

### Risk: OpenAI-compatible behavior regresses

Mitigation: parity tests compare old generate/edit payloads and attachment behavior to new provider mode behavior.

### Risk: batch composer loses independent per-draft modes

Mitigation: `BatchComposerDraft` stores its own `providerModeId`. Batch request builder resolves provider/mode per draft, never from global selected provider.

### Risk: old snapshots break

Mitigation: detail/restoration code reads legacy `mode` as fallback and maps it to provider modes where possible.

### Risk: provider mode transport becomes vague

Mitigation: provider mode definition must explicitly declare JSON/multipart, required file roles, and server submit handler expectations.

### Risk: Hires Fix output size semantics are unclear

Mitigation: first slice uses current width/height as target dimensions. Revisit only if runtime smoke proves the UX bad.

---

## Non-goals

- Full arbitrary ComfyUI workflow editor.
- Custom node graph import/export.
- Multi-image ComfyUI Hires Fix.
- ComfyUI masking/inpainting.
- ControlNet mode.
- Pure promptless upscale mode.
- Full storage architecture rewrite.

---

## PRE Review Prompt

Review this revised plan before execution. Focus on:

1. Whether removing global user-facing `generate/edit` modes is staged safely.
2. Whether provider mode ownership prevents duplicate UI/request/detail paths.
3. Whether OpenAI-compatible behavior is preserved as provider-owned modes.
4. Whether ComfyUI Hires Fix is correctly modelled as a provider mode with one required target image.
5. Whether server submit unification has clear cutover/kill criteria.
6. Whether batch independence remains protected per draft/provider/mode.
7. Whether acceptance evidence proves the result from Max’s perspective, not just from TypeScript’s perspective.
