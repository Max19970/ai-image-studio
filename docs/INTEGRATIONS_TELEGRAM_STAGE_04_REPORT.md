# Integrations + Telegram — Stage 04 Report

Дата: 2026-06-19  
Статус: выполнено

## Цель этапа

Реализовать серверный Telegram runtime adapter без bot-framework зависимости и без влияния на generation/provider/gallery/composer pipeline.

## Preflight-симуляция и проверка долга

Наивный вариант — подключить тяжёлый bot framework, держать polling прямо в route handler и разносить Telegram-логику по routes/settings — отклонён.

Принятое решение:

- отделить Telegram Bot API client от runtime lifecycle;
- держать polling state в server runtime adapter, а не в React/UI state;
- подключать Telegram через generic `IntegrationRuntimeAdapter`;
- регистрировать built-in adapter идемпотентно, чтобы тесты и будущие integrations могли подменять adapter без конфликта;
- не трогать generation/provider/task/gallery/composer код.

## Изменённые зоны

- `server/integrations/builtins.ts`
- `server/integrations/index.ts`
- `server/integrations/telegram/**`
- `server/app.ts`
- `tests/telegram-integration-adapter.test.ts`
- `docs/INTEGRATIONS_TELEGRAM_PLAN_2026-06-19.md`
- `docs/INTEGRATIONS_TELEGRAM_STAGE_04_REPORT.md`

## Реализовано

- `TelegramBotApiClient`:
  - `getMe()`;
  - `deleteWebhook()`;
  - `setChatMenuButton()`;
  - `setMyCommands()`;
  - `sendMessage()`;
  - `getUpdates()`.
- `TelegramPollingRuntime`:
  - explicit `start()`;
  - explicit `stop()`;
  - `getStatus()`;
  - runtime-only update offset;
  - abort/clear timer on stop/error.
- `TelegramIntegrationAdapter`:
  - `validate-token`;
  - `apply-menu-button`;
  - `start-runtime` through generic route handling;
  - `stop-runtime` through generic route handling.
- `/start` update handler:
  - sends configured start message;
  - attaches Web App inline button;
  - denies non-allowlisted Telegram users.
- Mini App auth helper:
  - validates `Telegram.WebApp.initData` through HMAC SHA-256;
  - checks `auth_date` max age;
  - uses timing-safe hash comparison.

## Архитектурные границы

Не изменялись:

- generation runner;
- provider adapters;
- gallery/detail/composer/batch runner;
- `StudioSettings`;
- central settings context для Telegram runtime state.

## Проверки

Команда:

```bash
npm run verify:static
```

Результат:

- `arch:check:strict` — passed;
- `imports:check` — 0 cycles;
- `interface:check` — passed;
- `params:check` — passed;
- `providers:check` — passed;
- `tasks:check` — passed;
- `storage:check` — passed;
- `css:check` — passed;
- `motion:check` — passed;
- `ui:check` — passed;
- `debt:check` — passed with existing ComfyUI warning only;
- `secrets:check` — passed;
- `npm test` — 101/101 passed;
- `npm run build` — passed.

Raw log: `artifacts/stage-reports/integrations-stage4-verify-static.log`.

## Известные ограничения

- MVP использует polling, webhook-mode оставлен как future-ready config branch.
- Mini App auth helper добавлен, но публичный auth endpoint будет логичнее подключать на следующем этапе вместе с client-side Telegram Mini App runtime.
- Реальная проверка Telegram Bot API требует живой token, поэтому network behavior покрыт mock fetch unit tests.
