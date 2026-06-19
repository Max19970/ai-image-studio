# Integrations/Telegram stage 01 report

Дата: 2026-06-19  
Этап: 1 — Generic architecture для интеграций  
Статус: готово

## Что сделано

Добавлен isolated generic-слой интеграций:

- `src/entities/integrations/types.ts`
  - `IntegrationId`, `IntegrationDefinition`, `IntegrationPublicConfig`, `IntegrationSecretPatch`, `IntegrationRuntimeStatus`, `IntegrationActionResult` и связанные типы.
- `src/entities/integrations/registry.ts`
  - client registry интеграций;
  - первая definition-запись: `telegram`;
  - Telegram представлен только generic metadata/actions, без UI/runtime/storage логики.
- `src/infrastructure/integrations/api.ts`
  - typed API wrapper для будущих endpoints:
    - `listIntegrations()`;
    - `loadIntegrationConfig()`;
    - `saveIntegrationConfig()`;
    - `loadIntegrationStatus()`;
    - `startIntegration()`;
    - `stopIntegration()`;
    - `runIntegrationAction()`.
- `server/integrations/types.ts`
  - server-side `IntegrationRuntimeAdapter` contract.
- `server/integrations/registry.ts`
  - registration map для server runtime adapters;
  - регистрация/удаление/list/require без Express coupling.
- `tests/integrations-registry.test.ts`
  - client registry contract;
  - защита от UI/settings/provider/generation импортов в generic entity layer;
  - проверка route shapes client API;
  - проверка server registry lifecycle.

## Архитектурные решения

- `StudioSettings` не изменялся.
- `SettingsSectionContext` не расширялся.
- Provider/generation contracts не изменялись.
- Telegram пока не имеет runtime adapter и не получает storage: это задачи следующих этапов.
- Client registry может знать, что существует интеграция `telegram`, но не импортирует Telegram UI.
- Server registry пока generic: конкретная Telegram adapter-регистрация появится на этапе server adapter.

## Проверки

- `npm ci` — passed после повторного извлечения stage0 архива.
- `npm run verify:static` — passed.
- `npm test` внутри `verify:static` — passed, 92/92 tests.
- `npm run build` внутри `verify:static` — passed.
- `arch:check:strict` — passed, 0 boundary violations.
- `imports:check` — passed, 0 cycles across 476 internal source files.
- `secrets:check` — passed.

Raw output:

- `artifacts/stage-reports/integrations-stage1-verify-static.log`

## Известный warning

Сохранился baseline warning, не связанный с интеграциями:

- `src/entities/generation-params/comfyui/ComfyUiGenerationSurface.tsx`: 305 lines при warning limit 300.

Новый integration код не увеличил этот hotspot и не затрагивал ComfyUI/generation зоны.

## Функциональные изменения

Пользовательских UI/runtime изменений на этапе 1 нет. Это намеренно: этап создаёт архитектурную основу, чтобы storage/routes/UI Telegram добавлялись через отдельные owner-модули.

## Следующий этап

Этап 2 — Storage и безопасность секретов.

Перед началом этапа 2 нужно симулировать storage/API изменения:

- отдельный encrypted bucket `integration-settings.v1`;
- config normalization/sanitization;
- token patch semantics;
- routes `/api/integrations/**`;
- тесты, что raw token никогда не возвращается в UI responses.
