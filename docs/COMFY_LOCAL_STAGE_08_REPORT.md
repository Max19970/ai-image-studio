# ComfyUI Local Generation — Stage 08 Report

## Result

Stage 08 is complete: the control menu is now provider-aware.

## Changed architecture

Added client adapter-owned control surfaces:

- `api-image` surface for OpenAI-compatible providers;
- `local-workflow` surface for ComfyUI.

The surface declares whether the composer should show:

- mode switcher;
- image attachment controls;
- mask controls;
- LoRA registry controls;
- parameters;
- batch transition.

Composer and batch draft toolbar now consume this surface through context instead of checking provider names directly.

## User-facing behavior

OpenAI-compatible providers keep the existing menu:

- generate/edit mode switcher;
- image/reference attachments;
- mask;
- provider/model picker;
- parameters;
- batch.

ComfyUI now shows an MVP-local workflow menu:

- provider/model picker;
- registered LoRA quick toggles;
- parameters;
- batch.

ComfyUI does not show unsupported OpenAI-style edit, image attachments or mask controls in the MVP.

## Files added

- `src/entities/provider/controlSurface.ts`
- `src/entities/generation-params/comfyui/loraSelection.ts`
- `src/entities/generation-params/comfyui/ui/ComfyUiLoraQuickGroup.tsx`
- `src/entities/generation-params/comfyui/ui/ComfyUiLoraQuickGroup.module.css`
- `tests/provider-control-surface.test.ts`
- `docs/COMFY_LOCAL_STAGE_08_PREFLIGHT.md`
- `docs/COMFY_LOCAL_STAGE_08_REPORT.md`

## Important files changed

- `src/entities/provider/types.ts`
- `src/providers/openai-compatible/definition.ts`
- `src/providers/comfyui/definition.ts`
- `src/features/composer/ImageComposer.tsx`
- `src/features/composer/composerTypes.ts`
- `src/features/composer/elements/control-menu/ComposerControlMenuAction.tsx`
- `src/features/composer/sections/actions/ComposerActionsSection.tsx`
- `src/features/batch-composer/MultiImageComposer.tsx`
- `src/features/batch-composer/batchComposerTypes.ts`
- `src/features/batch-composer/sections/draft-list/BatchDraftListSection.tsx`
- `src/features/batch-composer/sections/draft-toolbar/BatchDraftToolbarSection.tsx`
- `src/entities/generation-params/comfyui/ComfyUiGenerationSurface.tsx`
- `src/app/workspace/contexts/createDockContext.ts`
- `src/app/workspace/contexts/createMainContext.ts`
- `src/interface/context/commands.ts`
- `src/app/commands/createComposerCommands.ts`
- `src/shared/i18n/locales/*/composer.json`
- `src/shared/i18n/locales/*/params.json`

## Checks

Passed:

```txt
npm run providers:check
npm run verify:static
npm test
npm run build
npm run capture:screenshots -- --viewports=desktop,mobile --scenarios=composer-controls,composer-comfy-controls,batch-composer-controls,batch-comfy-controls --out=artifacts/stage08-visual
node scripts/check-screenshot-artifacts.mjs --dir=artifacts/stage08-visual --viewports=desktop,mobile --scenarios=composer-controls,composer-comfy-controls,batch-composer-controls,batch-comfy-controls
```

`verify:static` includes architecture, import cycles, interface registry, generation params, provider adapters, task lifecycle, storage, CSS, motion, UI accessibility, debt budget, secrets, tests and production build.

Test count after this stage: 79 passed, 0 failed.

Visual capture produced 8 screenshots: OpenAI-compatible and ComfyUI control menus for single composer and batch composer on desktop and mobile. The shell wrapper hit the timeout after the capture summary, so the generated PNGs were verified separately with `check-screenshot-artifacts`. Chromium policy was restored after the visual run.

## Notes

LoRA connection is intentionally shown as a quick control-menu action, not as a raw JSON field in the ComfyUI parameter panel. The parameter panel now only hints that LoRA presets are controlled from the menu.

This keeps ComfyUI LoRA UX request-scoped while avoiding a provider-specific JSON textarea in the main parameter surface.
