# Hires Fix QoL Actions and Mode-Owned Value Validation Implementation Plan

**Intent:** Add a gallery Hires Fix quick action and move image-size / Hires-scale submit validation into provider generation mode contracts.

**Current Behavior:** Gallery quick actions can open details/download/delete, but cannot directly continue a finished image through ComfyUI Hires Fix. Size fields currently expose numeric steps and adapters validate custom sizes without active provider mode ownership. ComfyUI Hires Fix exposes target width/height instead of an upscale multiplier.

**Expected Outcome:** A generated image can be sent to ComfyUI Hires Fix from its quick action. The composer switches to a ComfyUI model, selects `comfyui.hires-fix`, attaches the selected image as target, restores the selected request prompt/params, and stores input dimensions for scale-based Hires sizing. Provider modes define how image sizes and Hires scale are resolved before submit; UI input keeps the user's typed values until payload/snapshot creation. Size fields do not expose hard browser min/max limits; mode-specific rules are shown through inline info popovers. The composer Control popover stays open after internal selections/actions and closes only via outside/escape/trigger dismissal.

**Truth Owner:** Provider generation mode definitions own value constraints. Provider request adapters and payload builders consume the resolved values. Gallery command wiring owns the Hires Fix quick action flow.

**Contract Boundary:** UI passes raw user input. Submit-time builders resolve values using provider mode constraints. Hires Fix scale is ComfyUI-owned provider state, not a global ImageParams field.

**Cutover:** Replace Hires Fix target width/height UI with Hires scale UI. Keep stored `width`/`height` as resolved payload output for compatibility, but no longer ask the user to edit them directly in Hires Fix mode.

**Displaced Path:** Displace adapter-only custom size validation as the only source of rules. Displace Hires Fix desired target size fields as user-facing controls.

**Acceptance Evidence:** Tests cover value constraint snapping, OpenAI-compatible size snapping to multiples of 8, ComfyUI Hires Fix scale payload, and gallery quick action parameter preparation. `npm run build` passes. Visual QA checks quick actions and parameters where possible.

## Staged Checklist

### Stage 0 — Worktree, baseline, map
Status: [x] done and verified

- [x] Main checkout inspected; it has unrelated Telegram changes.
- [x] Isolated worktree created.
- [x] Branch `feature/qol-hires-fix-action` created.
- [x] Current Hires Fix code and provider-mode architecture inspected.

Architecture/debt evaluation: isolated worktree prevents mixing with unrelated dirty main changes. Existing provider-mode contract is the right extension point.

### Stage 1 — Mode-owned value constraints
Status: [x] done and verified

- [x] Add reusable size/numeric constraint types and resolver helpers.
- [x] Add constraints to OpenAI-compatible and ComfyUI generation modes.
- [x] Update request adapter validation/payload paths to receive active provider mode.
- [x] Ensure size payloads are snapped down at submit/snapshot time, not while typing.
- [x] Remove hard browser min/max constraints from size inputs.
- [x] Add mode-specific size rule info popovers to size fields.

Architecture/debt evaluation: this avoids provider-specific UI branching and prepares future ComfyUI modes.

### Stage 2 — Hires Fix scale UI/payload
Status: [x] done and verified

- [x] Add ComfyUI Hires scale and source image dimensions to ComfyUI provider state.
- [x] Replace Hires Fix target width/height fields with scale field.
- [x] Resolve Hires Fix target size from source dimensions × snapped scale on payload build.
- [x] Update summaries/i18n/tests.

Architecture/debt evaluation: keep Hires Fix state in ComfyUI surface, not in global params.

### Stage 3 — Gallery Hires Fix quick action
Status: [x] done and verified

- [x] Add command to convert selected generated image into a target File.
- [x] Select first available ComfyUI model and `comfyui.hires-fix` mode.
- [x] Restore the selected image request params into composer.
- [x] Store selected image source dimensions for scale-based Hires Fix.
- [x] Add menu action placement and RU/EN labels.

Architecture/debt evaluation: quick action is gallery wiring; restoration remains through existing request-snapshot surfaces.

### Stage 4 — Verification
Status: [~] mostly done

- [x] Add or update tests for constraints, Hires scale, and quick action helpers.
- [x] Run focused tests.
- [x] Run `npm run build`.
- [~] Run visual QA if screenshot runner is available — attempted, but DevSpace command invocation was blocked for screenshot runner commands in this session.

### Stage 5 — Follow-up QoL pass
Status: [x] done and verified

- [x] Remove hard min/max from size input fields; clamp/snap remains submit-time only.
- [x] Add mode-specific size rules info popovers via `providerMode.valueConstraints.imageSize.infoKey`.
- [x] Keep composer Control popover open after provider mode, model, attachment, mask, parameter, batch, and clear actions; it now relies on normal outside/escape/trigger dismissal.
- [x] Run TypeScript check, focused value constraint test, and production build.
