# ComfyUI local generation — Stage 10 report

Date: 2026-06-19

## Result

Stage 10 is implemented as an end-to-end MVP integration layer for local ComfyUI generation.

The application now ships with a non-active `Local ComfyUI` preset, adapter-aware server provider parsing, ComfyUI resource/error states in settings, clearer workflow/history errors, and mocked end-to-end coverage proving that a ComfyUI request can produce a gallery-ready image snapshot through the existing flow.

## Implemented changes

### Server provider parsing

- Added `parseProviderSettings(value)` to the server provider registry.
- `generationRoutes` and `providerRoutes` now parse providers through the selected adapter schema instead of the generic provider schema.
- This avoids rejecting valid ComfyUI settings, such as longer local timeouts, before the request reaches the ComfyUI adapter.

### Default ComfyUI preset

- Added `comfyUiGenerationProvider` to `data/studio.defaults.json`:
  - name: `Local ComfyUI`;
  - endpoint: `http://127.0.0.1:8188`;
  - adapter: `comfyui`;
  - timeout: `900000`.
- Added an empty `ComfyUI checkpoint` model preset bound to that provider.
- The active selected model remains the existing OpenAI-compatible default, so local ComfyUI is opt-in.

### ComfyUI settings/resources

- ComfyUI resource refresh now caches:
  - checkpoints;
  - LoRA files;
  - samplers;
  - schedulers.
- The ComfyUI settings panel shows all four resource counters.
- Added empty/error states for:
  - zero discovered checkpoints;
  - registered LoRA pointing to a missing actual ComfyUI file;
  - resource fetch warnings.

### ComfyUI error handling

- `/prompt` responses with `node_errors` are surfaced as request errors instead of continuing to a confusing history wait.
- Failed ComfyUI history statuses are converted into compact user-facing messages before the generic “no output images found” fallback.

### Timeout behavior

- New ComfyUI providers default to a longer local timeout.
- Provider timeout UI allows ComfyUI-compatible upper bounds while preserving the stricter bound for OpenAI-compatible providers.

## Verification

Passed:

```txt
npm run verify:static
```

The verification included:

```txt
npm test
87 passed, 0 failed

npm run build
passed

debt warnings
none
```

Targeted screenshot artifacts were checked:

```txt
7 desktop screenshots checked
3 mobile screenshots checked
4 additional mobile screenshots checked
```

Visual scenarios covered:

- composer ComfyUI controls;
- parameters;
- ComfyUI settings;
- models settings;
- ComfyUI detail page;
- ComfyUI technical detail page;
- batch ComfyUI controls.

Chromium policy was restored after visual verification.

## Not performed in container

A live ComfyUI run was not performed because the container does not have the user's local ComfyUI instance, checkpoints and LoRA files.

The mocked integration test covers the app-side flow, but the final live smoke should be done locally.

## Local manual smoke checklist

1. Start ComfyUI locally and confirm it is reachable at `http://127.0.0.1:8188`.
2. Start Image Studio.
3. Open Settings → API generation → ComfyUI.
4. Refresh resources and confirm checkpoints/LoRA/samplers/schedulers are detected.
5. Open the ComfyUI provider/model entry and select a checkpoint.
6. Return to the main composer and select `Local ComfyUI → <checkpoint>` in the model popover.
7. Enter a text prompt and generate.
8. Confirm the result appears in the gallery.
9. Open details and confirm ComfyUI-specific fields are shown.
10. Restore the request from details and confirm the composer returns to the ComfyUI setup.

## Notes for the next implementation pass

- Live progress over WebSocket is still intentionally out of scope.
- Task-scoped cancel is still intentionally conservative; ComfyUI `/interrupt` is global and should not be wired as a normal per-task cancel without a queue ownership layer.
- Edit/img2img workflows should be added as new workflow strategies, not by expanding the text-to-image builder in place.
