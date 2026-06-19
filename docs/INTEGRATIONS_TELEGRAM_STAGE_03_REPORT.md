# Integrations/Telegram stage 03 report

Дата: 2026-06-19  
Этап: 3 — Вкладка `Интеграции` в настройках  
Статус: готово

## Preflight-симуляция и архитектурное решение

Наивный путь — добавить Telegram-состояние (`botToken`, `miniAppUrl`, `startTelegramBot`, `telegramStatus`) прямо в `SettingsPage.tsx` и `SettingsSectionContext` — отклонён. Это превратило бы общую страницу настроек в owner конкретной интеграции и усложнило бы добавление следующих интеграций.

Принятое решение:

- в общий settings layer добавлен только tab id `integrations`;
- вкладка и секция подключены через существующие placements;
- вся Telegram/UI-драфт логика живёт внутри `src/features/settings/sections/integrations/**`;
- секция сама работает с generic integration API из `src/infrastructure/integrations/**`;
- `SettingsPage.tsx` не знает про Telegram fields/actions.

## Что сделано

Добавлено/изменено:

- `src/features/settings/settingsTypes.ts`
  - добавлен tab-level id `integrations`;
  - добавлен комментарий, что конкретное состояние интеграций не должно попадать в общий context.
- `src/interface/placements/settings.tabs.placement.ts`
  - добавлена вкладка `settings.tabs.integrations`.
- `src/interface/placements/settings.sections.placement.ts`
  - добавлены desktop/mobile placements для `settingsSections.integrations`.
- `src/features/settings/sections/integrations/definition.ts`
  - lazy definition для новой секции.
- `src/features/settings/sections/integrations/IntegrationsSettingsSection.tsx`
  - owner-секция вкладки интеграций.
- `src/features/settings/sections/integrations/IntegrationSubTabs.tsx`
  - registry-driven под-вкладки интеграций.
- `src/features/settings/sections/integrations/TelegramIntegrationPanel.tsx`
  - панель управления Telegram config/status/actions.
- `src/features/settings/sections/integrations/useIntegrationSettingsDraft.ts`
  - локальный hook загрузки/сохранения public config и secret patch.
- `src/features/settings/sections/integrations/integrationLabels.ts`
  - i18n-key mapping для labels/hints интеграций.
- `src/features/settings/sections/integrations/IntegrationsSettingsSection.module.css`
  - scoped desktop/mobile стили новой вкладки.
- `src/shared/i18n/locales/ru/settings.json`
- `src/shared/i18n/locales/en/settings.json`
  - ru/en ключи вкладки, Telegram-панели, статусов и действий.
- `tests/settings-integrations.test.ts`
  - статическая проверка placements и отсутствия Telegram state в central settings page/context.

## Что не менялось

- `StudioSettings` не расширялся.
- `SettingsSectionContext` не получил Telegram-specific fields.
- Provider/generation/gallery/detail/composer/batch runner не изменялись.
- Telegram runtime adapter ещё не реализован — это следующий этап.

## Поведение UI на этом этапе

- В настройках появилась вкладка `Интеграции`.
- Внутри вкладки есть под-вкладка `Телеграм`, построенная из integration registry.
- Панель Telegram показывает:
  - runtime status;
  - enabled toggle;
  - secret input для bot token;
  - token preview из server public config, без raw token;
  - Mini App URL;
  - menu button text;
  - `/start` message;
  - allowlist поле;
  - polling interval;
  - action-кнопки save/validate/apply/start/stop.
- До этапа Telegram adapter action-кнопки, требующие runtime, ожидаемо показывают readable server error про незарегистрированный adapter.

## Проверки

Выполнено:

- `npm ci` — passed;
- `npm run build` — passed;
- `npm test` — 96/96 passed;
- `npm run verify:static` — все проверки внутри лога passed, включая 96 tests и production build. В одном прогоне shell tool вернул timeout уже после строки `✓ built`, поэтому отдельно сохранён `integrations-stage3-build.log` с успешной сборкой.

Ключевые проверки из verify:

- `arch:check:strict` — 0 violations;
- `imports:check` — 0 cycles across 486 internal source files;
- `interface:check` — passed, `settingsSections.integrations` используется двумя placements;
- `storage:check` — passed;
- `css:check` — passed;
- `motion:check` — passed;
- `ui:check` — passed;
- `debt:check` — passed;
- `secrets:check` — passed;
- `npm test` — 96/96 passed;
- `npm run build` — passed.

Raw logs:

- `artifacts/stage-reports/integrations-stage3-test.log`
- `artifacts/stage-reports/integrations-stage3-build.log`
- `artifacts/stage-reports/integrations-stage3-verify-static-final.log`

## Известный warning

Остался старый baseline warning, не связанный с интеграциями:

- `src/entities/generation-params/comfyui/ComfyUiGenerationSurface.tsx`: 305 lines при warning limit 300.

## Следующий этап

Этап 4 — Telegram server adapter.

Перед реализацией нужно снова сделать preflight-симуляцию: не ставить тяжёлый bot framework, а вынести Telegram HTTP client, runtime manager и adapter в отдельные `server/integrations/telegram/**` модули.
