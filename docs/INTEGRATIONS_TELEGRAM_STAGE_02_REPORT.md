# Integrations/Telegram stage 02 report

Дата: 2026-06-19  
Этап: 2 — Storage и безопасность секретов  
Статус: готово

## Preflight-симуляция и архитектурное решение

Наивный путь — положить `telegramToken` в `StudioSettings.adapterData` или отдавать весь integration config обратно в UI — отклонён. Это смешало бы provider adapter data с runtime-секретами внешних интеграций и повысило риск утечки токена через localStorage/client snapshots.

Принятое решение:

- отдельный encrypted app document bucket `integration-settings.v1`;
- server-only storage owner для integration settings;
- public config содержит только `configured`, `preview`, `updatedAt` для секретов;
- secret patch semantics: непустой `value` обновляет, пустой `value` не меняет, `clear: true` удаляет;
- action responses проходят route-level redaction на случай, если runtime adapter случайно попытается вернуть raw secret.

## Что сделано

Добавлено/изменено:

- `server/storage/appDocumentStore.ts`
  - добавлен `integrationSettingsBucket = 'integration-settings.v1'`.
- `server/storage/integrationSettingsStore.ts`
  - public API загрузки/сохранения/patch runtime config;
  - хранение секретов отдельно от `StudioSettings`.
- `server/storage/integration-settings/types.ts`
  - типы persisted/public integration settings.
- `server/storage/integration-settings/integrationSettingsCodecs.ts`
  - normalize/sanitize/mask helpers;
  - stripping secret-like keys из public `values`;
  - runtime config assembly.
- `server/routes/integrationRoutes.ts`
  - `GET /api/integrations`;
  - `GET /api/integrations/:id/config`;
  - `PUT /api/integrations/:id/config`;
  - `GET /api/integrations/:id/status`;
  - `POST /api/integrations/:id/start`;
  - `POST /api/integrations/:id/stop`;
  - `POST /api/integrations/:id/actions/:action`.
- `server/routes/index.ts`
  - подключение integration routes.
- `src/entities/integrations/types.ts`
  - добавлен generic `IntegrationSecretDefinition`.
- `src/entities/integrations/registry.ts`
  - Telegram definition теперь объявляет `botToken` как secret metadata.
- `tests/integrations-storage.test.ts`
  - unit test storage sanitize/normalize/patch semantics;
  - route test, который намеренно заставляет mock adapter вернуть raw token, и проверяет redaction.

## Что не менялось

- `StudioSettings` не расширялся.
- `SettingsSectionContext` не расширялся.
- Provider/generation contracts не изменялись.
- Gallery/detail/composer/batch runner не изменялись.
- Telegram runtime adapter ещё не реализован — это отдельный будущий этап.

## Дополнительное восстановление baseline assets

Во входном `stage1` archive отсутствовала папка `src/data/**`, из-за чего `npm test` падал на импорте `src/data/studio.defaults.json`. Папка была восстановлена из stage0/fix-pack без изменения содержимого. Это не функциональная правка интеграций, а восстановление проектных ассетов, необходимых для baseline проверок.

## Проверки

Выполнено:

- `npm ci` — passed;
- `npm run verify:static` — passed;
- `npm test` внутри verify — 94/94 passed;
- `npm run build` внутри verify — passed;
- `arch:check:strict` — 0 violations;
- `imports:check` — 0 cycles across 480 internal source files;
- `storage:check` — passed;
- `secrets:check` — passed;
- `debt:check` — passed.

Raw log:

- `artifacts/stage-reports/integrations-stage2-verify-static.log`

## Известный warning

Остался только старый baseline warning, не связанный с интеграциями:

- `src/entities/generation-params/comfyui/ComfyUiGenerationSurface.tsx`: 305 lines при warning limit 300.

Новый integration storage изначально превысил 300 строк, поэтому был сразу разделён на `store/types/codecs`, чтобы не добавлять новый warning и не накапливать долг.

## Следующий этап

Этап 3 — вкладка `Интеграции` в настройках.

Перед ним нужно симулировать UI-встраивание и убедиться, что Telegram state не попадёт в общий `SettingsSectionContext`: интеграционная секция должна сама работать через `src/infrastructure/integrations/api.ts` и registry.
