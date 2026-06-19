# ComfyUI local generation — Stage 10 preflight

Date: 2026-06-19

## Stage goal

Close the MVP loop for local ComfyUI generation:

- keep ComfyUI available as a first-class provider without making it the default active provider;
- make request parsing adapter-aware on the server;
- surface live resource and workflow errors clearly enough for the user to fix local setup issues;
- verify that the existing gallery/detail/restore flow can consume ComfyUI results without a provider-specific fork.

## Current architecture check

### Existing strengths

- Server and client provider registries already contain adapter contracts.
- Provider-owned generation surfaces keep ComfyUI params in `ImageParams.providerParams.comfyui`.
- Control menus and detail pages are adapter-driven.
- Gallery result mapping still accepts the same image payload shape, so the gallery should not need to know about ComfyUI internals.

### Debt risks before implementation

| Risk | Decision |
| --- | --- |
| Parsing ComfyUI providers with the generic OpenAI-compatible schema | Move route parsing to adapter-specific settings schema lookup. |
| Adding live ComfyUI errors directly into settings JSX | Reuse settings cache metadata and keep error rendering narrow/local to the ComfyUI settings panel. |
| Creating a ComfyUI-only gallery or process runner | Do not fork gallery/runner. Adapter maps local output to the existing generation result shape. |
| Making `Local ComfyUI` active by default | Add preset, but keep the existing OpenAI-compatible default selected. |
| Treating `/interrupt` as safe cancellation | Avoid it for MVP because it is global to the ComfyUI queue, not task-scoped. |

## Planned changes

- Add a non-active default ComfyUI provider/model preset.
- Parse provider settings through adapter-owned schemas in provider/generation routes.
- Extend ComfyUI settings cache visibility for checkpoints, LoRA, samplers and schedulers.
- Add clear empty/error states for missing checkpoints and missing registered LoRA files.
- Improve ComfyUI workflow/history error messages.
- Add mocked end-to-end tests for ComfyUI request → adapter → gallery-ready result snapshot.
- Run static, unit, build and targeted visual checks.

## Manual live-test boundary

A real local ComfyUI smoke test requires the user's local ComfyUI process, checkpoints and LoRA files. The container cannot verify that part honestly, so this stage validates the integration with mocked ComfyUI HTTP responses and leaves a short manual checklist in the stage report.
