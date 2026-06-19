# Integrations / Telegram — Stage 06 Preflight

Date: 2026-06-19
Stage: Telegram panel UX and management diagnostics

## Scope

Only integration-owned code is allowed to change:

- `src/features/settings/sections/integrations/**`
- `src/infrastructure/integrations/**` only if a new client boundary is required
- `src/integrations/telegram-mini-app/**` only for Mini App auth diagnostic reuse
- `src/entities/integrations/**` for action metadata
- `server/integrations/telegram/**` for Telegram-specific diagnostic actions
- tests and docs

Generation, provider, gallery, composer and batch flows must remain untouched.

## Simulated changes

Naive path rejected:

- put all readiness logic into `TelegramIntegrationPanel.tsx`;
- enable Start/Menu actions whenever a saved token exists;
- let actions run while the form has unsaved changes;
- store test chat id as a general Studio setting.

Debt/architecture impact: bad. That would make the panel large, make action behavior confusing, and leak Telegram diagnostics into broader app settings.

Accepted path:

- keep form state in the existing integration settings hook;
- add a tiny `telegramPanelValidation.ts` owner helper for HTTPS/chat-id/readiness/action guards;
- keep diagnostic test fields local to the Telegram panel;
- add a Telegram adapter action `send-test-message` as a Telegram-specific diagnostic action;
- reuse the existing Mini App validation endpoint through the Telegram Mini App auth client;
- keep `SettingsPage`, generation/provider contracts and `StudioSettings` unchanged.

## Debt check before implementation

Expected new files stay below 300 lines:

- `TelegramIntegrationPanel.tsx` remains under 300 lines.
- New panel validation helper remains small and framework-independent.
- New panel CSS module avoids growing the existing integration CSS file past warning budget.
- Server adapter receives only a small action branch, not a new framework dependency.

No central registry, provider model or generation parameter structures need broad edits.
