# ComfyUI Local Generation — Stage 08 Preflight

## Scope

Stage 08 changes the composer control menus so their visible actions are provider-aware.

The main goal is to make ComfyUI generation feel native without copying the whole OpenAI-compatible menu:

- OpenAI-compatible providers keep mode switching, attachments, mask, model picker, parameters and batch.
- ComfyUI hides unsupported edit/image/mask actions for the MVP.
- ComfyUI exposes model picker, LoRA quick toggles, parameters and batch.

## Current architecture check

Relevant existing seams before the change:

- Provider adapters already expose capabilities, generation surfaces and detail descriptors.
- The single composer and batch draft toolbar use separate feature components.
- Compatibility policy already sanitizes mode/attachments when provider capabilities do not support them.
- ComfyUI LoRA registry lives in settings adapter data.

## Simulated implementation

Planned structure:

1. Add `controlSurface` to client provider adapter definitions.
2. Resolve the active control surface from selected model/provider instead of checking adapter IDs in JSX.
3. Pass the resolved surface through workspace/composer/batch contexts.
4. Reuse one ComfyUI LoRA quick group in both single composer and batch draft toolbar.
5. Guard hidden file input handlers as well as visible buttons.
6. Keep `ParameterPanel` focused on node/provider parameters; LoRA quick connection belongs to the control menu.

## Debt gate

The planned changes should not increase architectural debt if these constraints hold:

- no duplicated ComfyUI copy of `ComposerControlMenuAction`;
- no `adapterId === 'comfyui'` branching in composer JSX;
- no new ComfyUI fields in shared `ImageParams` outside `providerParams.comfyui`;
- batch and single composer consume the same adapter-owned surface model;
- tests cover both OpenAI-compatible and ComfyUI surfaces.

## Decision

Proceed with a small adapter-contract extension: `ProviderControlSurfaceDefinition`.

This is healthier than hard-coding provider-specific menu rules inside feature components because every future provider can declare its own composer controls without changing the menu architecture first.
