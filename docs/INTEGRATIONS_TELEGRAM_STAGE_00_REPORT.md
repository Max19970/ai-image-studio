# Integrations/Telegram stage 00 report

Дата: 2026-06-19  
Этап: 0 — Baseline и границы изменений  
Статус: готово

## Что сделано

- Актуальный архив проекта распакован в рабочую копию.
- Зависимости установлены через `npm ci`.
- Проверены ключевые зоны будущей интеграции:
  - settings feature: `src/features/settings/**`;
  - interface placements: `src/interface/placements/**`;
  - server routes: `server/routes/**`;
  - server storage: `server/storage/**`.
- Основной план помещён в проект:
  - `docs/INTEGRATIONS_TELEGRAM_PLAN_2026-06-19.md`.
- Чеклист этапа 0 в плане отмечен как выполненный.
- Создан preflight-документ этапа:
  - `docs/INTEGRATIONS_TELEGRAM_STAGE_00_PREFLIGHT.md`.
- Raw output проверок сохранён в:
  - `artifacts/stage-reports/integrations-stage0-verify-static-rerun.log`;
  - `artifacts/stage-reports/integrations-stage0-build.log`.

## Baseline-проверки

- `npm ci` — passed.
- `npm run verify:static` — passed.
- `npm test` внутри `verify:static` — passed, 88/88 tests.
- `npm run build` внутри `verify:static` — passed.

Первый запуск `verify:static` был остановлен лимитом окружения на финальном `vite build`, поэтому после него сборка была прогнана отдельно и прошла успешно. Затем `verify:static` был повторён с увеличенным лимитом и завершился с exit code 0.

## Архитектурный baseline

Текущее состояние перед кодовыми изменениями:

- `arch:check:strict` — passed, 0 boundary violations.
- `imports:check` — passed, 0 cycles across 468 internal source files.
- `interface:check` — passed, 51 definitions, 53 placements, 38 slots.
- `storage:check` — passed, storage schema version 2, app document buckets already used for settings/params/provider probe cache.
- `secrets:check` — passed, obvious API keys/private keys/bearer tokens не найдены.
- `debt:check` — passed with one existing warning.

## Известный baseline warning

`npm run debt:check` сообщает один уже существующий warning:

- `src/entities/generation-params/comfyui/ComfyUiGenerationSurface.tsx`: 305 lines при warning limit 300.

Оценка: это не блокирует этапы интеграций. Файл находится в ComfyUI/generation-params зоне и не должен затрагиваться при добавлении generic integration слоя. Специальный рефакторинг до этапа 1 не нужен, потому что следующий этап может быть реализован добавлением новых integration modules без правок этого hotspot.

## Разрешённые зоны изменений для следующих этапов

Основные зоны:

- `src/entities/integrations/**`
- `src/features/settings/sections/integrations/**`
- `src/infrastructure/integrations/**`
- `src/integrations/telegram-mini-app/**`
- `server/integrations/**`
- `server/routes/integrationRoutes.ts`
- `server/storage/integrationSettingsStore.ts`
- `tests/integrations-*.test.ts`

Допустимые точки подключения:

- `src/interface/placements/settings.tabs.placement.ts`
- `src/interface/placements/settings.sections.placement.ts`
- `src/features/settings/settingsTypes.ts` — только для нового tab id, без Telegram-specific state.
- `server/routes/index.ts` — только для подключения integration routes.
- `server/storage/appDocumentStore.ts` или соседний storage registry — только если потребуется новый app-document bucket.
- i18n dictionaries: текущая структура локалей или отдельный integrations dictionary, с сохранением parity-теста.

## Запрещённые зоны без отдельного основания

Не трогать на следующих этапах, если задача прямо не потребует:

- generation runner;
- provider adapters;
- generation params registry;
- gallery;
- image detail page;
- single composer;
- batch composer / batch runner;
- ComfyUI workflow/runtime;
- OpenAI-compatible request/response pipeline.

## Debt/architecture gate перед этапом 1

Наивный путь — добавить `telegramToken`, `telegramBotEnabled`, `telegramMiniAppUrl` в `StudioSettings` и прокинуть всё через `SettingsPage` — отклонён.

Корректный путь для этапа 1:

- сначала добавить generic contracts/registry интеграций;
- не добавлять Telegram-specific поля в центральные settings/provider/generation типы;
- client registry может знать, что существует integration id `telegram`, но не должен импортировать Telegram UI в generic слой;
- server registry должен принимать adapter registration, а не держать runtime logic внутри routes;
- storage для секретов остаётся задачей этапа 2, не смешивается с `StudioSettings`.

## Функциональные изменения

Функциональный код приложения на этапе 0 не менялся.

Изменены/добавлены только документы и raw stage logs.

## Следующий этап

Этап 1 — Generic architecture для интеграций.

Перед началом этапа 1 нужно отдельно просимулировать конкретные изменения по файлам:

- `src/entities/integrations/types.ts`
- `src/entities/integrations/registry.ts`
- `server/integrations/types.ts`
- `server/integrations/registry.ts`
- `src/infrastructure/integrations/api.ts`
- минимальные тесты registry/import boundaries

Критерий допуска: generic слой не импортирует UI/features и не меняет generation/provider contracts.
