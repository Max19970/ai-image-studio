# Integrations / Telegram — Stage 06 Report

Date: 2026-06-19
Stage: Telegram panel UX and management diagnostics

## Implemented

- Split the Telegram settings panel into clearer zones:
  - runtime status;
  - connection/token;
  - Mini App URL/menu button;
  - access and behavior;
  - runtime actions;
  - diagnostics.
- Added `telegramPanelValidation.ts` for panel-owned readiness and action guard logic.
- Added readiness diagnostics for:
  - saved token state;
  - HTTPS Mini App URL state;
  - unsaved config state;
  - runtime state.
- Added disabled action reasons via button titles and diagnostic feedback.
- Prevented config actions from running with stale form values: Start/Menu/Test require saved config and a valid HTTPS Mini App URL.
- Kept token input write-only: saved token is still displayed only through preview metadata.
- Added transient diagnostic fields:
  - test chat/user id;
  - Mini App `initData` sample.
- Added `send-test-message` Telegram adapter action. It sends the configured `/start` message plus a Web App button to the provided chat id.
- Reused `POST /api/integrations/telegram/mini-app/validate` for pasted `initData` diagnostics.
- Added RU/EN localization for new panel copy.
- Added tests for panel validation/action guards and diagnostic send-message payload.

## Architecture notes

- No Telegram state was added to `SettingsPage.tsx`, `SettingsSectionContext`, `StudioSettings`, generation providers, gallery, composer or batch runner.
- Diagnostic fields remain local UI state and are not persisted into general settings.
- Telegram-specific diagnostics stay in `server/integrations/telegram/**` and the integration panel owner module.
- New CSS lives in `TelegramIntegrationPanel.module.css`, avoiding growth of the shared integration section CSS.

## Validation

- `npm run verify:static` — passed.
- `npm test` — 109/109 passed.
- `npm run build` — passed as part of `verify:static`.
- `arch:check:strict` — 0 violations.
- `imports:check` — 0 cycles.
- `interface:check` — passed.
- `storage:check` — passed.
- `css:check` — passed.
- `ui:check` — passed.
- `secrets:check` — passed.
- `debt:check` — passed with the existing ComfyUI 305-line warning only.

## Known baseline warning

`src/entities/generation-params/comfyui/ComfyUiGenerationSurface.tsx` remains at 305 lines with a warning budget of 300. This is pre-existing and unrelated to integrations.

## Visual QA

Targeted visual screenshot scenario for `settings-integrations` is intentionally left for Stage 08, where the screenshot runner and documentation are planned together.
