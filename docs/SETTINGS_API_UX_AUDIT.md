# Settings/API UX audit

Stage 14 keeps settings registry-driven while reducing the dense Generation API section into smaller owner modules.

## Boundaries

- `GenerationApiSettingsSection.tsx` owns only the desktop/mobile shell and provider/model focus switch.
- `GenerationApiDesktopPanels.module.css` owns desktop provider/model lists, inspectors, and active/empty cards.
- `GenerationApiMobilePanels.module.css` owns mobile provider/model cards, horizontal entity strips, accordions, and active model card.
- `GenerationApiEditor.module.css` owns provider/model editor shells, field grids, and auth checkbox card.
- `ProviderAdapterField.module.css` owns adapter profile presentation.
- `ProviderCheckCard.module.css` owns quick/probe controls and result feedback.
- `settingsDraftSelection.ts` owns pure provider/model selection rules used by reset/save flows.

## Draft/save/cancel behavior

- Editing provider/model/theme mutates only the local settings draft and marks the page dirty.
- Cancel restores the draft from persisted settings, resets provider/model selection from the saved settings, clears the saved flash, and closes active info popovers.
- Save resolves the selected model through `resolveSafeSelectedModelId` before persisting. If the currently focused model no longer exists, the first available model is selected; if no model exists, the selected id becomes an empty string.
- Provider removal also removes its models and selects the first remaining model/provider pair.
- Model removal keeps at least one model and falls back to the first remaining model.

## Theme preview independence

Interface theme previews are explicit per-theme CSS classes, not derived from the currently active app theme. Each card applies its own choice/swatch/accent class from the selected preview theme id, while the active theme only controls radio state and selected styling.

## Verification

- `npm run verify:static`
- focused visual capture for `settings-api` and `settings-models` on desktop/mobile
- manual browser pass still recommended for save/cancel, keyboard selection, and real provider probe flows
