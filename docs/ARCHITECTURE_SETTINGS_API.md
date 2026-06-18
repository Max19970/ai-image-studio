# Settings API generation architecture

The generation API settings screen is split into small feature-owned blocks. The top-level section only chooses the desktop/mobile variant and switches between provider and model focus.

## Main entry points

```text
src/features/settings/sections/generation-api/
  GenerationApiSettingsSection.tsx
  useGenerationApiSettingsDraft.ts
  utils.ts
```

- `GenerationApiSettingsSection.tsx` owns only section composition and the Providers/Models focus switch.
- `useGenerationApiSettingsDraft.ts` owns provider/model draft selection, CRUD mutations, patch helpers, probe model selection, and provider options.
- `utils.ts` contains small section helpers shared by nested blocks.

## Provider blocks

```text
provider-list/
  ProvidersDesktop.tsx
  ProvidersMobile.tsx
provider-editor/
  ProviderEditor.tsx
  ProviderFields.tsx
  ProviderCoreFields.tsx
  ProviderEndpointFields.tsx
  ProviderAuthFields.tsx
adapter-selector/
  ProviderAdapterField.tsx
custom-headers-editor/
  ProviderCustomHeadersField.tsx
provider-check-panel/
  ProviderCheckCard.tsx
```

Provider list components own only selection UI for desktop/mobile. Provider editor components own the editable fields. Adapter selection, custom headers, and provider checks are separate modules because they are the most likely adapter-specific extension points.

## Model blocks

```text
model-list/
  ModelsDesktop.tsx
  ModelsMobile.tsx
model-editor/
  ModelEditor.tsx
  ModelFields.tsx
```

Model list components own the model picker and active model cards. Model editor components own model name, model id, provider binding, and notes.

## Why this split exists

The previous `GenerationApiSettingsSection.tsx` mixed providers, models, editors, adapter profiles, custom headers, probe UI, and mobile layout in one file. That made new provider adapters risky because every new provider-specific setting pushed the same file toward a larger UI monolith.

The current split keeps the settings API area composable:

- new provider list behavior belongs in `provider-list`;
- new editable provider fields belong in `provider-editor` or a new adapter-specific block;
- new adapter profile behavior belongs in `adapter-selector`;
- provider probe/check behavior belongs in `provider-check-panel`;
- draft selection and mutations belong in `useGenerationApiSettingsDraft`.

`SettingsPage.tsx` still owns page-level state such as active settings tab, interface theme selection, save/reset, and active info tooltip. Provider/model draft logic has moved out of the page component.

## Verification

After changing this area, run:

```bash
npm run build
npm run arch:check
npm run arch:check:strict
npm run interface:check
npm run capture:screenshots -- --viewports=desktop,mobile --scenarios=settings-api
```
