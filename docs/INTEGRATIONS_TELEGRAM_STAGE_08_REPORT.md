# Integrations / Telegram — stage 08 report

Дата: 2026-06-19  
Этап: Visual QA и документация

## Выполнено

- Добавлен screenshot scenario `settings-integrations`.
- Добавлены вспомогательные visual scenarios:
  - `settings-integrations-empty`;
  - `settings-integrations-validation-error`.
- Screenshot runner получил scoped mock для `/api/integrations/**`, используемый только сценариями с `integrationApiFixture`.
- Добавлен step `scrollToSelector` для стабильного позиционирования action-feedback в desktop/mobile screenshots.
- `npm run verify:visual` и `visual:check` теперь включают основной сценарий `settings-integrations`.
- Добавлена документация `docs/TELEGRAM_INTEGRATION.md`.
- README получил краткое упоминание интеграции и ссылку на документацию.
- В Telegram panel action feedback перенесён ближе к actions card; Mini App diagnostic feedback остался в diagnostics card.
- План обновлён: этап 8 и итоговый definition of done закрыты.

## Visual QA

Targeted command:

```bash
SCREENSHOT_CAPTURE_ATTEMPTS=1 node scripts/capture-app.mjs --viewports=desktop,mobile --scenarios=settings-integrations-empty,settings-integrations,settings-integrations-validation-error --out=artifacts/telegram-integration-screens
```

Artifact check:

```bash
node scripts/check-screenshot-artifacts.mjs --dir=artifacts/telegram-integration-screens --viewports=desktop,mobile --scenarios=settings-integrations-empty,settings-integrations,settings-integrations-validation-error
```

Result:

- 6 screenshots captured.
- 6 screenshots passed artifact validation.
- Visually checked desktop and mobile states:
  - empty config;
  - saved token preview + running status;
  - token validation error.

Note: full `npm run verify:visual` was not run because the stage required a targeted integration visual pass. The main visual script was updated to include `settings-integrations` for future full-release runs.

## Static verification

```bash
npm run verify:static
```

Result: passed.

Details:

- architecture boundary: passed;
- import cycles: 0;
- interface registry: passed;
- parameter/provider/task/storage/css/motion/ui checks: passed;
- secrets check: passed;
- tests: 117/117 passed;
- production build: passed.

Existing warning remains unchanged:

- `src/entities/generation-params/comfyui/ComfyUiGenerationSurface.tsx` — 305 lines against warning budget 300.

## Screenshot environment note

Chromium in the container had managed policy `URLBlocklist: ["*"]`. For the screenshot pass, only that key was temporarily removed and restored immediately after capture. This was an environment-only change, not a project change.

## Scope confirmation

No generation/provider/gallery/composer/batch logic was changed in this stage.
