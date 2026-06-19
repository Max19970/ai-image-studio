# Integrations / Telegram — stage 08 preflight

Дата: 2026-06-19  
Этап: Visual QA и документация

## Симуляция изменений

Планируемые изменения относятся только к финальной проверке Telegram-интеграции:

- добавить screenshot scenarios для `Settings → Integrations → Telegram`;
- добавить mock `/api/integrations/**` в screenshot runner, чтобы визуальная проверка не требовала реального Telegram token;
- добавить документацию `docs/TELEGRAM_INTEGRATION.md`;
- добавить короткую ссылку из `README.md`;
- улучшить расположение feedback в Telegram panel: результат action-кнопок должен появляться рядом с actions, а не ниже диагностического блока.

## Проверка риска техдолга

Риск: screenshot runner может начать знать слишком много о Telegram.

Решение: Telegram mock хранится только в screenshot config/runner и не попадает в runtime приложения. Production-код интеграции не зависит от screenshot fixtures.

Риск: документация может пообещать webhook, хотя MVP реализует polling.

Решение: документация явно фиксирует, что MVP использует polling и не включает webhook wizard.

Риск: feedback в Telegram panel может смешать action-ответы и Mini App diagnostics.

Решение: action feedback отображается в actions card, Mini App/diagnostic feedback — в diagnostics card. Это локальное изменение внутри Telegram panel, без изменения общего settings context.

## Разрешённые зоны изменений

- `scripts/screenshot.config.mjs`
- `scripts/capture-app.mjs`
- `src/features/settings/sections/integrations/TelegramIntegrationPanel.tsx`
- `src/shared/i18n/locales/*/settings.json`
- `docs/TELEGRAM_INTEGRATION.md`
- `docs/INTEGRATIONS_TELEGRAM_PLAN_2026-06-19.md`
- `README.md`
- `package.json`

## Запрещённые зоны изменений

- generation/provider/gallery/composer/batch runtime logic;
- server Telegram runtime behavior;
- storage codecs and encryption logic;
- generic settings context shape beyond already-completed integration tab work.
