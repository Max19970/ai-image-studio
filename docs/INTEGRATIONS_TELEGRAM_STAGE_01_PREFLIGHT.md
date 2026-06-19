# Integrations/Telegram stage 01 preflight

Дата: 2026-06-19  
Этап: 1 — Generic architecture для интеграций

## Цель этапа

Добавить расширяемый generic-слой интеграций до появления Telegram-specific runtime/storage/UI. На этом этапе сайт не получает новую вкладку настроек и не запускает Telegram-бота; добавляются только контракты, registry и typed client API boundary.

## Симуляция изменений

Планируемые файлы:

- `src/entities/integrations/types.ts` — shared client/domain контракты интеграций.
- `src/entities/integrations/registry.ts` — client registry доступных интеграций, пока с definition `telegram`.
- `src/entities/integrations/index.ts` — barrel экспорт только entity-level типов/registry.
- `src/infrastructure/integrations/api.ts` — typed client API для будущих server routes.
- `src/infrastructure/integrations/index.ts` — API barrel.
- `server/integrations/types.ts` — server-side runtime adapter contract.
- `server/integrations/registry.ts` — регистрация runtime adapters без Express/routes coupling.
- `server/integrations/index.ts` — server integrations barrel.
- `tests/integrations-registry.test.ts` — contract tests.

## Отклонённый наивный вариант

Не делаем:

- `telegramToken` / `telegramBotEnabled` / `telegramMiniAppUrl` в `StudioSettings`;
- Telegram поля в `SettingsSectionContext`;
- Telegram-ветвления в `SettingsPage.tsx`;
- импорт Telegram UI в generic registry;
- изменения generation/provider/gallery/composer flow.

Такой путь увеличил бы связность настроек и заставил бы каждую следующую интеграцию редактировать центральные структуры.

## Debt/architecture gate

Проверяемые риски:

- `entities` не должны импортировать `features`, `interface`, `app` или UI.
- Новый integration registry не должен зависеть от provider/generation контрактов.
- Server registry не должен запускать runtime из route-level кода.
- Client API module не должен требовать уже существующих routes на этапе 1; routes появятся на этапе 2 вместе со storage.

## Нужен ли предварительный рефакторинг

Нет. Существующие настройки/provider/generation модули можно не менять. Этап реализуется добавлением новых isolated modules, поэтому предварительный рефакторинг не требуется.

## Проверки после этапа

- `npm run arch:check:strict`
- `npm run imports:check`
- `npm test`
- `npm run build`
- итогово: `npm run verify:static`
