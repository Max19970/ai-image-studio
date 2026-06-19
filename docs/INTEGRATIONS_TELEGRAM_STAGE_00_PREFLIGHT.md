# Integrations/Telegram stage 00 preflight

Дата: 2026-06-19  
Этап: 0 — Baseline и границы изменений

## Цель этапа

Зафиксировать исходное состояние Image Studio перед добавлением слоя интеграций и Telegram-бота, проверить здоровье кодовой базы и явно ограничить зоны будущих изменений.

На этом этапе runtime-поведение приложения не меняется.

## Планируемые действия

- Развернуть актуальный архив проекта.
- Установить зависимости через lockfile.
- Проверить существующие точки расширения:
  - `src/features/settings/**`;
  - `src/interface/placements/**`;
  - `server/routes/**`;
  - `server/storage/**`.
- Прогнать статические проверки и сборку.
- Зафиксировать разрешённые и запрещённые зоны изменений для следующих этапов.

## Затрагиваемые файлы

Документация и отчётность этапа:

- `docs/INTEGRATIONS_TELEGRAM_PLAN_2026-06-19.md`
- `docs/INTEGRATIONS_TELEGRAM_STAGE_00_PREFLIGHT.md`
- `docs/INTEGRATIONS_TELEGRAM_STAGE_00_REPORT.md`
- `artifacts/stage-reports/integrations-stage0-verify-static-rerun.log`
- `artifacts/stage-reports/integrations-stage0-build.log`

Функциональный код приложения на этапе 0 не меняется.

## Симуляция результата

- Новый пользовательский сценарий: отсутствует.
- Новый server API: отсутствует.
- Новый client API: отсутствует.
- Новые storage buckets: отсутствуют.
- Что останется неизменным: генерация, провайдеры, ComfyUI, галерея, detail page, composer, batch runner, параметры генерации.
- Что будет подготовлено: документированная baseline-точка и архитектурные границы для следующих этапов.

## Debt/architecture gate

Проверяемый риск: добавить Telegram как набор полей в текущие settings/provider структуры и тем самым размыть ownership.

Решение для будущих этапов:

- `StudioSettings` не становится местом хранения интеграционных секретов.
- `SettingsSectionContext` не расширяется Telegram-specific состоянием.
- Telegram runtime живёт на сервере, а React только управляет им через API.
- Интеграции добавляются через registry/definition, а не через прямые условия в центральных страницах.
- Provider/generation pipeline не получает интеграционных ветвлений.

## Нужен ли предварительный рефакторинг

Перед этапом 0 — нет. Этап документальный и проверочный.

Перед этапом 1 нужен не рефакторинг существующего функционала, а добавление отдельного generic integration слоя. Это позволит избежать изменения generation/provider контрактов и разрастания `SettingsPage`.

## Проверки после этапа

- `npm run verify:static`
- при необходимости отдельно `npm run build`

## Итоговый статус

Готово к выполнению этапа 0.
