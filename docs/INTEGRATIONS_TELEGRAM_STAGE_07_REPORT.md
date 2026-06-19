# Stage 07 report — tests and architecture verification

Date: 2026-06-19
Scope: integration/Telegram verification hardening.

## Changes made

Added focused checklist-level tests:

- `tests/telegram-bot-client.test.ts`
  - `getMe` success response;
  - Bot API error formatting without extra token leakage in error messages;
  - `setChatMenuButton` Web App payload shape.
- `tests/telegram-mini-app-auth.test.ts`
  - valid signed `initData`;
  - invalid hash after payload tampering;
  - expired `auth_date`;
  - missing token/hash failures.
- `tests/integrations-routes.test.ts`
  - integration config read/write;
  - integration list/status routes;
  - start/stop runtime routes;
  - route-level redaction of stored secrets in messages and JSON data.

Updated:

- `docs/INTEGRATIONS_TELEGRAM_PLAN_2026-06-19.md` checklist and stage 7 result.
- `docs/INTEGRATIONS_TELEGRAM_STAGE_07_PREFLIGHT.md`.

## Architecture/debt review

Implementation code was intentionally not changed during this stage. The stage adds tests and documentation only.

No changes were made to:

- generation runner;
- provider adapters;
- gallery/detail/composer/batch modules;
- current settings API/provider configuration flows.

The test split reduces maintenance debt compared with keeping all Telegram coverage in one broad adapter test file.

## Verification

Passed:

- `npm test` — 117/117 tests passed.
- `npm run build` — production build passed.
- `npm test && npm run build` — passed as a combined smoke sequence.
- The static checks inside `npm run verify:static` reached and passed:
  - `arch:check:strict`;
  - `imports:check`;
  - `interface:check`;
  - `params:check`;
  - `providers:check`;
  - `tasks:check`;
  - `storage:check`;
  - `css:check`;
  - `motion:check`;
  - `ui:check`;
  - `debt:check`;
  - `secrets:check`;
  - `npm test`.

Runner note: direct `npm run verify:static` was attempted more than once and reached the final `npm run build` step, but the shell runner timed out while Vite was at `transforming...`. Running `npm run build` separately completed successfully in the same workspace, so the functional verification components are considered passed, but the timeout is recorded here honestly.

Known unchanged warning:

- `src/entities/generation-params/comfyui/ComfyUiGenerationSurface.tsx` — 305 lines over the 300-line warning budget. This is pre-existing and outside the integration scope.
