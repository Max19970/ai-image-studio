# Comfy/local stage 01 report

## Статус

Готово.

## Что изменено

- Расширен server provider adapter contract:
  - `capabilities`;
  - `resources`;
  - optional `fetchResources(provider, kind)`.
- Добавлены server-side типы provider resources:
  - `ProviderResourceKind`;
  - `ProviderResourceDescriptor`;
  - `ProviderResourceEntry`;
  - `ProviderResourceList`.
- Добавлен proxy route:
  - `POST /api/provider/resources`.
- Расширен client provider adapter contract:
  - `capabilities`;
  - `resources`;
  - `generationSurface`;
  - `detailDescriptor`.
- OpenAI-compatible adapter объявляет v2 metadata, но runtime-поведение генерации/редактирования не изменено.
- Добавлен client helper `fetchProviderResources(provider, kind)`.
- Обновлены `providers:check`, contract tests и `docs/PROVIDER_ADAPTER_CONTRACT.md`.

## Архитектурная проверка

- ComfyUI-specific веток в `ImageComposer`, `ParameterPanel`, `DetailSnapshotSections` не добавлялось.
- Новые ComfyUI-параметры не добавлялись в `ImageParams`.
- Settings/UI не получили provider-name branching.
- Batch/single runner не получили provider-specific branching.
- Provider resources доступны только через локальный Express proxy, а не напрямую из браузера.

## Проверки

- `npm run providers:check` — passed.
- `npm test` — passed, 58 tests.
- `npm run build` — passed.
- `npm run verify:static` — passed.

## Следующий этап

Этап 2: provider-owned generation surface. Нужно перевести текущий OpenAI-compatible logical params registry в surface implementation и добавить extension bucket для provider-owned параметров без раздувания общего `ImageParams` конкретными ComfyUI-полями.
