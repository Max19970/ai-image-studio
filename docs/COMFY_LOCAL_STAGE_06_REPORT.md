# ComfyUI local generation — этап 6 report

Дата: 2026-06-19

## Что сделано

Добавлен клиентский ComfyUI provider adapter:

```txt
src/providers/comfyui/
  definition.ts
  requestAdapter.ts
  responseAdapter.ts
  settingsSchema.ts
  index.ts
```

Добавлен provider-owned generation surface:

```txt
src/entities/generation-params/comfyui/
  state.ts
  requestSurface.ts
  ComfyUiGenerationSurface.tsx
  index.ts
```

Также добавлен `src/entities/generation-params/requestSurfaceTypes.ts`, чтобы request-safe ComfyUI surface не создавал import cycle с общим registry.

## Архитектура

- `state.ts` — normalize/read/build payload/summary для ComfyUI параметров без React.
- `requestSurface.ts` — request-safe adapter для snapshot/payload/detail summary.
- `ComfyUiGenerationSurface.tsx` — UI tabs/fields для параметров ComfyUI.
- `src/providers/comfyui/requestAdapter.ts` — submit config через `/api/generate` и payload warnings.
- `src/providers/comfyui/responseAdapter.ts` — использует текущий normalized server JSON `data[].b64_json`, поэтому галерея не менялась.
- `src/providers/comfyui/definition.ts` — client adapter contract, aligned с server adapter.

## Параметры ComfyUI MVP

Provider-owned state:

```ts
{
  negativePrompt,
  width,
  height,
  batchSize,
  seedMode,
  seed,
  steps,
  cfg,
  samplerName,
  scheduler,
  denoise,
  filenamePrefix,
  loras
}
```

Payload:

```ts
{
  prompt,
  checkpoint,
  width,
  height,
  batch_size,
  steps,
  cfg,
  sampler_name,
  scheduler,
  denoise,
  filename_prefix,
  negative_prompt?,
  seed?,
  loras?
}
```

## Важные решения

- ComfyUI параметры не добавлялись в top-level `ImageParams`.
- `ParameterPanel` не получил ComfyUI-specific ветвлений: он продолжает работать через provider surface registry.
- `infrastructure/api.ts` не получил ComfyUI-specific parsing: response adapter остаётся ответственным за images.
- Detail page получает provider-specific строки через `parameterSummary`.
- LoRA registry и live dropdown ресурсов оставлены на этап 7, чтобы не смешивать client adapter foundation с settings UX.

## Проверки

```txt
npm run verify:static
passed

npm test
72 passed, 0 failed

npm run build
passed
```

Визуально проверены существующие сценарии parameters/detail:

```txt
node scripts/check-screenshot-artifacts.mjs --dir=artifacts/stage06-visual --viewports=desktop,mobile --scenarios=parameters,parameters-render,parameters-service,detail
passed: 8 screenshots
```

Скриншот runner во время capture успел сохранить все 8 PNG, но сам shell-command был остановлен по timeout на последнем retry. После этого артефакты отдельно проверены `check-screenshot-artifacts`, а Chromium policy восстановлена.

## Добавленные тесты

- `generation-surface.test.ts`: ComfyUI payload + provider params snapshot + parameter summary.
- `provider-adapter-contract.test.ts`: alignment client/server ComfyUI adapter id/capabilities/resources/surface/detail settings.

## Definition of Done

- [x] Client adapter `comfyui` зарегистрирован.
- [x] ComfyUI request surface строит provider-owned payload.
- [x] ComfyUI response adapter возвращает изображения в текущий gallery flow.
- [x] Detail summary зависит от ComfyUI surface, а не от OpenAI payload labels.
- [x] Общий `ImageParams` не раздут ComfyUI-полями.
- [x] `ParameterPanel` не содержит `if comfyui`.
- [x] `verify:static` зелёный.
