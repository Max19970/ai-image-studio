# CSS migration architecture

Stage 10 completes the move from a global stylesheet dump to a scoped, owner-oriented CSS structure. The previous structural pass split the old `global.css` into domain layers. This completion pass moved the highest-risk global selectors into their owning React/CSS-module components and turned the remaining global CSS into a much smaller base/mobile shell.

## Current structure

```text
src/styles/
  global.css                    # import-only entrypoint
  tailwind.css                  # Tailwind directives only
  layers/
    base.css                    # tokens, theme variables, reset/base rules
    app-shell-and-primitives.css# app shell and global primitives that are intentionally app-wide
    mobile.css                  # unlayered final mobile override quarantine
```

Feature/shared-owned styles now live beside their code:

```text
src/shared/ui/FloatingPopover/FloatingPopover.module.css
src/shared/ui/PopoverSelect/PopoverSelect.module.css
src/features/composer/ui/ActionIconButton.module.css
src/features/composer/ui/ComposerPopover.module.css
src/features/workspace/StudioInfoPage.module.css
src/features/settings/components/SettingsPopoverSelect.module.css
src/features/settings/sections/interface/InterfaceSettingsSection.module.css
src/features/settings/SettingsPage.module.css
src/features/settings/sections/generation-api/GenerationApiSettingsSection.module.css
src/features/parameters/ParameterPanel.module.css
src/features/batch-composer/MultiImageComposer.module.css
src/features/gallery/ResultsGallery.module.css
```

`src/styles/global.css` must stay an ordered import manifest. Do not add raw selectors there.

## What moved in the completion pass

- Floating popover shell styles moved into `FloatingPopover.module.css`.
- Popover select styles moved into `PopoverSelect.module.css`.
- Composer action icon styles moved into `ActionIconButton.module.css`.
- Composer inline popover/choice styles moved into `ComposerPopover.module.css`.
- Workspace info/guides styles moved into `StudioInfoPage.module.css`.
- Settings popover select accents moved into `SettingsPopoverSelect.module.css`.
- Interface theme preview styles moved into `InterfaceSettingsSection.module.css`.
- Batch toolbar/header micro button overrides moved into `MultiImageComposer.module.css` and raw buttons were replaced with shared `Button` primitives.
- Parameter panel styles are owned by `ParameterPanel.module.css`; stale global parameter selectors were removed.
- `mobile.css` was unwrapped from `@layer components` and had legacy `!important` removed. It is imported last as a final responsive quarantine.

## Remaining global CSS

Global CSS is now limited to:

- design tokens and themes;
- page/app shell layout;
- reusable primitive classes that are intentionally global (`glass-panel`, `field-input`, `detail-row`, `status-pill`, etc.);
- mobile overrides that still span multiple features.

The remaining debt is concentrated in `mobile.css`. It no longer uses `!important`, but it still contains cross-feature responsive rules. Future visual passes should move those rules into owner modules when touching the relevant feature.

## Checks

Run:

```bash
npm run css:check
```

The checker verifies:

- `global.css` contains only the expected ordered imports;
- imported layer files match the files in `src/styles/layers`;
- braces are balanced;
- Tailwind directives are isolated in `src/styles/tailwind.css`;
- `mobile.css` stays unlayered;
- remaining `!important` usage stays below the strict limit.

Current expected summary after Stage 10 completion:

```text
4 CSS entry imports
3 CSS layer files
~2600 layer lines
4 !important usages outside the entrypoint
```

## Visual verification

After scoped extraction, run:

```bash
npm run capture:screenshots -- --viewports=desktop,mobile --scenarios=gallery,settings-api,settings-models,settings-interface,detail,batch-composer,info,parameters
```

The Stage 10 completion pass was visually checked with these desktop/mobile scenarios. `mobile-parameters` was captured in a second short run because the large combined capture closed Chromium near the end.

## Rule of thumb

New CSS should go next to the owner component first. Add global selectors only when the rule is intentionally app-wide or when a short-lived migration override is unavoidable and documented.
