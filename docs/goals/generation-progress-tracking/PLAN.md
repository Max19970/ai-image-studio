# Generation Progress Tracking Implementation Plan

Goal: add provider-owned live progress to Image Studio. OpenAI-compatible providers use streaming partial/final image events. ComfyUI uses server-side websocket monitoring bridged through the app proxy stream. UI consumes normalized task images and progress state only.

Source of truth: provider adapters own acquisition and normalization; generation runners own task progress transitions; gallery/detail UI only reads GeneratedImage.kind and GenerationTask.progress.

Acceptance evidence:

- OpenAI-compatible partial_images remains a normal generation parameter and its streaming events are parsed.
- ComfyUI generation modes return streamed proxy responses with progress, previews, errors, and final images.
- Single and batch tasks store normalized progress.
- Succeeded streamed tasks promote final images over partial previews when final images are delivered.
- Live partial previews update in-place instead of accumulating preview frames.
- Gallery/detail surfaces select the newest in-flight preview and show compact percent labels when available.
- Tests and build pass.

## Checklist

### Stage 0 — Worktree, baseline, and plan

Status: done

- [x] Open isolated DevSpace worktree.
- [x] Create branch feature/generation-progress-tracking.
- [x] Read project protocol, AGENTS appendix, and relevant skills.
- [x] Inspect provider, runner, gallery, detail, and parameter code.
- [x] Install dependencies after baseline showed missing node_modules.
- [x] Write GOAL.md and this plan.

### Stage 1 — Normalized progress contract

Status: done

- [x] Add GenerationProgress to task/domain types.
- [x] Add optional progress fields to single tasks and batch items.
- [x] Extend client provider response adapter contract with progress and stream error extraction.
- [x] Extend submitImageRequest with onProgress while preserving onStreamImage.

### Stage 2 — OpenAI-compatible partial/final event handling

Status: done

- [x] Parse Image API partial events with b64_json.
- [x] Parse Responses API partial events with partial_image_b64.
- [x] Parse Responses API completed events with final image results.
- [x] Preserve non-stream JSON behavior.
- [x] Add tests for partial and final stream events.

### Stage 3 — ComfyUI websocket-to-SSE bridge

Status: done

- [x] Resolve ComfyUI websocket URL from provider endpoint.
- [x] Connect with the same client id used for prompt submission.
- [x] Convert ComfyUI progress messages into normalized progress events.
- [x] Convert binary preview frames into partial image events.
- [x] Keep history polling as the final-output resolver.
- [x] Return text/event-stream for ComfyUI generation modes.
- [x] Respect abort signal and provider timeout.

### Stage 4 — ComfyUI client adapter stream parsing

Status: done

- [x] Set ComfyUI submit request config to streamed for generation modes.
- [x] Parse bridge events into partial and final images.
- [x] Parse bridge events into normalized progress.
- [x] Parse bridge error events into thrown client errors.
- [x] Preserve final JSON collection behavior where tests need it.

### Stage 5 — Single and batch runner state updates

Status: done

- [x] Single runner stores progress on task.
- [x] Batch runner stores progress on both root task and active item.
- [x] Streamed final images replace progress-only partial lists on success.
- [x] Live partial previews replace their previous preview in the same single/batch item slot.
- [x] Batch partial previews are scoped by batchItemId and image index so parallel items do not overwrite each other.
- [x] Streamed/non-streamed behavior is derived from the submit adapter result, not provider-specific UI checks.
- [x] Add reducer and stream promotion tests.

### Stage 6 — Gallery, detail, and compact progress UI

Status: done

- [x] Gallery cards auto-select the newest image while a task is active.
- [x] Detail page defaults to the newest in-flight image while a task is active.
- [x] Status pills include compact percent when available.
- [x] Avoid adding heavier snapshot rows; topbar/card percent keeps UI compact.
- [x] No new i18n strings needed; numeric percent composes with existing status labels.

### Stage 7 — Contract and regression tests

Status: done

- [x] OpenAI-compatible stream parser tests.
- [x] ComfyUI fake-server SSE contract tests.
- [x] Batch progress reducer tests.
- [x] Full test suite passed through node test runner.
- [x] Storage compatibility covered by existing storage tests.

### Stage 8 — Build, visual QA, review, and report

Status: done

- [x] TypeScript check passed.
- [x] Vite production build passed.
- [x] All 149 tests passed.
- [~] Screenshot runner attempted but could not run because Chromium is missing at /usr/bin/chromium in the DevSpace environment.
- [x] Runtime ComfyUI behavior was manually verified by the user after enabling ComfyUI preview-method startup args.
- [x] Review final diff for accidental broad changes.
- [x] Send final Telegram report before final chat response.

## Known verification limits

Visual screenshot QA could not complete because the environment lacks the configured Chromium executable. ComfyUI live websocket progress and preview behavior is covered by stream contract tests and was manually verified by the user against a real local ComfyUI run.
