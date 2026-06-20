# Generation Plugin System Implementation Plan

**Intent:** Make generation modes and provider-owned parameters extensible through small feature/plugin modules so shared additions can be implemented once and composed into every compatible mode/provider path.
**Current Behavior:** Provider-owned ComfyUI parameters are rendered by a monolithic `ComfyUiGenerationSurface`, ComfyUI payload building is centralized in `state.ts`, and server workflow graphs are assembled by mode-specific functions in `workflowTemplates.ts`. Shared behavior can still require touching multiple mode branches.
**Expected Outcome:** A provider-agnostic generation extension contract exists on the client, a ComfyUI workflow extension contract exists on the server, and a real shared feature (LoRA) is wired through those contracts rather than being hard-coded directly into mode-specific UI/workflow assembly.
**Target-Perspective Output:** Max can add a future feature such as Tiled Generation or Tiled VAE Decode as a standalone module that declares its tabs/fields/payload/summary and, for ComfyUI, its workflow contribution, without editing every generation mode implementation.
**Truth Owner:** Generation extension registries own optional feature composition; provider adapters/surfaces own provider-specific interpretation and compatibility.
**Contract Boundary:** UI/state/payload extensions cross the `ProviderGenerationSurface` boundary; server workflow extensions cross the ComfyUI workflow builder boundary. Provider-specific runtime behavior stays inside each provider.
**Cutover:** Existing ComfyUI behavior must continue to work through the new extension path. LoRA becomes the first cutover feature from hard-coded surface/workflow wiring into extension composition.
**Displaced Path:** Direct hard-coding of shared optional ComfyUI features inside each mode branch is demoted. Existing mode-specific base graph construction remains only for the base mode skeleton.
**Value Density:** One shared feature cutover proves the extension point without rewriting the whole app or creating a generic schema renderer.
**Acceptance Evidence:** Type/test evidence that ComfyUI payloads, summaries and server workflows still include LoRA; new tests proving extension tabs can merge and workflow extensions can transform model/clip references before all compatible modes run.
**Evidence Lane:** `npm run test -- tests/generation-surface.test.ts tests/comfyui-server-adapter.test.ts` plus `npm run build`.
**Kill Criteria:** No duplicate old LoRA workflow path should remain in mode-specific graph builders. Future optional features must not require editing both `buildComfyUiTextToImageWorkflow` and `buildComfyUiHiresFixWorkflow` for shared contribution.
**Architecture Slice:** `src/entities/generation-params/*`, `src/entities/generation-params/comfyui/*`, `server/providers/comfyui/*`, relevant tests.
**Plan Review Gate:** Self-review required before execution and before final report.

## Architecture slice

**Files to create:**
- `src/entities/generation-params/extensionTypes.ts`
- `src/entities/generation-params/comfyui/extensions/*`
- `server/providers/comfyui/workflowExtensionTypes.ts`
- `server/providers/comfyui/workflowExtensions.ts`
- `docs/goals/generation-plugin-system/GOAL.md`

**Files to modify:**
- `src/entities/generation-params/types.ts`
- `src/entities/generation-params/comfyui/ComfyUiGenerationSurface.tsx`
- `src/entities/generation-params/comfyui/state.ts`
- `src/entities/generation-params/comfyui/requestSurface.ts`
- `src/entities/generation-params/comfyui/index.ts`
- `server/providers/comfyui/workflowTemplates.ts`
- `tests/generation-surface.test.ts`
- `tests/comfyui-server-adapter.test.ts`

**Files to avoid:**
- Global CSS and unrelated UI placement registries.
- OpenAI-compatible request behavior except shared type compatibility.
- Storage migrations.

**Source of truth:** Provider generation extension registries and ComfyUI workflow extension registry.
**Read path:** Parameter modal asks the provider surface for tabs/slots/stats; provider surface composes base mode sections plus registered extensions.
**Write path:** Extension fields patch the provider-owned params bucket; buildPayload collects base payload plus extension payload contributions.
**Contract boundary:** Extensions declare contribution points; base surfaces/builders only orchestrate.
**Integration points:** ComfyUI surface, ComfyUI request surface, ComfyUI server workflow builder.
**Migration/cutover:** LoRA is moved behind client/server extension modules with no behavior change.
**Displaced path:** Mode-specific LoRA node injection and UI slot hard-code.
**Acceptance evidence gate:** Tests demonstrate LoRA still works and composition is independent of text-to-image vs hires-fix mode.

## Task board

### Stage 0 — Preflight and plan

- [x] Create isolated worktree/branch.
- [x] Read project/agent instructions and relevant source files.
- [x] Create this Krypton plan and GOAL handoff.
- [x] Telegram progress reporting is active.
- Scope: docs only plus source inspection.
- Risk review: no code behavior changed.

### Stage 1 — Client extension contract

- [x] Add provider-neutral generation extension types for optional tabs, slots, tab stats, hidden summary, payload and summary entries.
- [x] Widen generation tab/slot typing so provider extensions can create tabs not known to the default UI.
- [x] Keep the contract code-owned, not automatic-form-driven.
- Files: `src/entities/generation-params/types.ts`, `src/entities/generation-params/extensionTypes.ts`.
- Verification: TypeScript build/test later.
- Risk review: avoid weakening existing OpenAI-compatible logical param contract.

### Stage 2 — ComfyUI client extension registry and LoRA cutover

- [ ] Add ComfyUI extension registry.
- [ ] Move LoRA UI contribution into a ComfyUI extension that contributes to the service tab/slot.
- [ ] Compose tabs, slot render output, tab stats, payload additions and summary entries through extensions.
- Files: `src/entities/generation-params/comfyui/*`.
- Verification: `tests/generation-surface.test.ts` plus build.
- Risk review: keep existing LoRA state shape and i18n keys to avoid persistence breakage.

### Stage 3 — Server ComfyUI workflow extension contract

- [ ] Add server-side workflow extension types for config normalization and graph contribution.
- [ ] Add a node allocator/composition context so extensions can add nodes without colliding with mode skeleton nodes.
- [ ] Move LoRA model/clip chain from base helper into a workflow extension.
- Files: `server/providers/comfyui/workflowExtensionTypes.ts`, `server/providers/comfyui/workflowExtensions.ts`, `server/providers/comfyui/workflowTemplates.ts`.
- Verification: ComfyUI server adapter tests.
- Risk review: preserve existing workflow node ids where tests/user diagnostics rely on them as much as possible.

### Stage 4 — Mode builders use shared workflow composition

- [ ] Keep base text-to-image and hires-fix builders responsible only for base graph skeleton.
- [ ] Run registered workflow extensions before sampler wiring, so shared model/clip/conditioning changes apply to both modes.
- [ ] Ensure output decode/save path remains compatible with future decode extensions.
- Files: `server/providers/comfyui/workflowTemplates.ts`.
- Verification: tests covering text-to-image and hires-fix workflows.
- Risk review: do not introduce a second hidden graph path.

### Stage 5 — Tests and acceptance evidence

- [ ] Extend surface tests for client extension composition.
- [ ] Extend server adapter tests for workflow extension composition and no duplicate direct LoRA path.
- [ ] Run targeted tests.
- Files: test files only.
- Verification: targeted test command.
- Risk review: tests should prove behavior, not implementation trivia only.

### Stage 6 — Build/static checks

- [ ] Run `npm run build` via logged background command.
- [ ] Run any relevant static checks if build reveals contract drift.
- Verification: log path and completion status.
- Risk review: do not claim visual QA for non-visual refactor.

### Stage 7 — Review, Telegram final report, final chat report

- [ ] Review git diff for accidental unrelated changes.
- [ ] Send final Telegram report before the chat final answer.
- [ ] Chat final includes changed files, checks, risks/manual checks, and acceptance reminder.
