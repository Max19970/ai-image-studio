# ComfyUI local generation — этап 6 preflight

Дата: 2026-06-19

## Цель этапа

Подключить ComfyUI на клиентской стороне: provider definition, request/response adapter, provider-owned parameter surface и snapshot/detail summary.

## Симуляция изменений перед кодом

Планируемые точки изменения:

- `src/providers/comfyui/*` — клиентский provider adapter и settings field schema.
- `src/entities/generation-params/comfyui/*` — request-safe и UI surface для ComfyUI параметров.
- `src/entities/provider/registry.ts` — регистрация `comfyui` рядом с OpenAI-compatible.
- `src/entities/generation-params/surfaceRegistry.ts` и `requestSurface.ts` — регистрация ComfyUI surface без правок `ParameterPanel`.
- `tests/generation-surface.test.ts` и `tests/provider-adapter-contract.test.ts` — контрактные проверки.

## Debt gate до реализации

Проверки риска:

- Нельзя добавлять ComfyUI поля в общий `ImageParams` как отдельные top-level поля.
- Нельзя добавлять `if comfyui` в `ParameterPanel` или `infrastructure/api.ts`.
- Request-safe surface не должен импортировать React/UI код.
- UI surface может жить отдельно и переиспользовать request-safe state/payload builder.
- Client/server provider contracts должны совпадать по id/capabilities/resources.

## Принятые решения

- Provider-owned state хранится в `ImageParams.providerParams.comfyui`.
- Request-safe код вынесен в `src/entities/generation-params/comfyui/state.ts` и `requestSurface.ts`.
- React surface вынесен отдельно в `ComfyUiGenerationSurface.tsx`.
- Для предотвращения import cycle интерфейсы request surface вынесены в `requestSurfaceTypes.ts`.
- Live dropdown samplers/schedulers/checkpoints будет этапом 7; этап 6 использует статический starter set и provider.modelId как checkpoint.

## Ожидаемые проверки

- `npm run verify:static`
- Contract tests для client/server ComfyUI adapter.
- Payload/snapshot/summary tests для ComfyUI request surface.
- Visual smoke для существующих parameters/detail сценариев.
