# Stage 07 preflight — integration tests and architecture checks

Date: 2026-06-19
Scope: Telegram/integrations verification only.

## Planned changes

- Add narrow test files that match the integration plan checklist names:
  - `tests/telegram-bot-client.test.ts`
  - `tests/telegram-mini-app-auth.test.ts`
  - `tests/integrations-routes.test.ts`
- Keep existing implementation code unchanged unless tests expose an actual defect.
- Update the integration plan checklist and add a stage report.

## Debt simulation

Naive option: keep all Telegram verification inside one broad `telegram-integration-adapter.test.ts` file and mark the checklist manually.

Risk: medium. The actual coverage would exist, but future maintainers would need to hunt through a large mixed test file to find Bot API, Mini App auth, and route-level guarantees.

Chosen option: add small, focused test files at the plan boundary level. This increases test count but improves maintainability and does not touch app runtime code.

## Guardrails

- No changes to generation, provider, gallery, composer, detail, or batch runner modules.
- No real Telegram token or network access in tests.
- Bot API calls stay mocked through `globalThis.fetch`.
- Route tests use a temporary encrypted storage path and a mock integration adapter.
