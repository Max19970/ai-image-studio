# Focus/performance stage 07 preflight — final acceptance

Дата: 2026-06-19  
Статус: [x] готово

## Цель этапа

Закрыть проход финальной приёмкой без новых пользовательских фич: подтвердить, что focus prompt behavior, memory/performance-правки и bundle/code-splitting не внесли UX, архитектурных или визуальных регрессий.

## Планируемые изменения

- Новые runtime/code изменения не планируются.
- Разрешены только документационные обновления:
  - этот preflight;
  - финальный acceptance report;
  - отметки в основном чеклисте.
- Build artifacts/screenshots используются только для проверки и не являются частью source architecture.

## Acceptance matrix

| Область | Desktop | Mobile | Проверка |
|---|---:|---:|---|
| Gallery | [x] | [x] | `gallery` screenshot |
| Composer compact | [x] | [x] | `composer-compact` screenshot |
| Composer long/focused prompt | [x] | [x] | `composer-long-prompt` screenshot + stage 01 focus measurement |
| Composer attachments | [x] | [x] | `composer-attachments` screenshot |
| Composer controls/parameters | [x] | [x] | `composer-controls`, `parameters` screenshots |
| Gallery quick actions/sidebar | [x] | [x] | `gallery-quick-actions`, `sidebar-collapsed` screenshots |
| Settings API/models | [x] | [x] | `settings-api`, `settings-models` screenshots |
| Detail carousel | [x] | [x] | `detail` screenshot + stage 04 DOM-window smoke/unit coverage |
| Attachment preview modal | [x] | [x] | `attachment-preview-modal` screenshot |
| Batch composer selected prompt | [x] | [x] | `batch-composer` screenshot + stage 01 focus measurement |
| Info | [x] | [x] | `info` screenshot |

## Симуляция результата

Ожидаемый результат финального acceptance:

- `verify:static` остаётся зелёным после всех этапов.
- `release:check` проходит, включая strict debt и storage audit.
- Visual matrix содержит 28 screenshots: 14 сценариев × 2 viewport-а.
- Build output сохраняет выигрыш этапа 6:
  - no Vite `chunk > 500 kB` warning;
  - стартовый/preloaded JS остаётся split между `index`, `react-vendor`, `i18n`, `rolldown-runtime`;
  - offscreen implementation chunks остаются async.
- Chromium policy в контейнере восстанавливается после screenshots.

## Debt/architecture gate

- Дублирование компонентов: не добавляется.
- Новые глобальные CSS-правки: не добавляются.
- Рост CSS/TS-файлов сверх debt budgets: не допускается; проверяет `debt:check`/`debt:check:strict`.
- Обход Definition/Placement: не допускается; проверяет `interface:check` и architecture gates.
- Связность feature/shared/process: не меняется; проверяет `arch:check:strict`.
- Motion/performance риск: новых motion-правок нет; проверяет `motion:check`.
- Memory lifecycle риск: новых object URL/cache changes нет; покрыто stage 02/03 tests и текущим test suite.
- Accessibility/keyboard риск: новых UI mechanics нет; проверяет `ui:check`.

## Нужен ли предварительный рефакторинг

Нет. Этап является приёмочным. Любая найденная регрессия должна была бы стать отдельным fix-stage с собственным preflight, а не правкой внутри acceptance.

## Проверки после этапа

- [x] `npm ci`
- [x] `npm run verify:static`
- [x] `npm run release:check`
- [x] `npm run visual:check`
- [x] segmented `capture:screenshots` для полной visual matrix, потому что монолитный visual run в контейнере снова завис на recoverable Chromium/Puppeteer retry.
- [x] Ручной просмотр финального contact sheet.
- [x] Chromium policy restored after screenshot capture.

## Итоговый статус

Статус этапа: [x] готово. Подробности: `docs/FOCUS_PERF_STAGE_07_REPORT.md`.
