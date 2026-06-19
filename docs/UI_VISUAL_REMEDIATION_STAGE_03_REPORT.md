# UI remediation stage 03 report

Дата: 2026-06-19

## Статус

Этап 3 выполнен по preflight-протоколу. Целью был global visual polish pass: empty gallery, sidebar width, theme grid, contrast/disabled states, focus states, RU terminology, info page и hierarchy счётчика галереи.

## Закрытые проблемы аудита

- [x] #6 P2 — empty gallery стала шире, получила явный CTA `Создать изображение` и короткое объяснение первого шага.
- [x] #11 P2 — theme grid на desktop перешла на сбалансированную раскладку `3 + 2`, mobile strip получил snap/fade/arrow hint.
- [x] #15 P2 — desktop sidebar уменьшен через `--sidebar-width-expanded`, ниже 1180px включается ещё более узкий expanded width.
- [x] #20 P3 — `--muted`/`--faint` стали контрастнее, disabled buttons теперь ослабляют фон/border, а не весь control opacity.
- [x] #21 P3 — `NavigationButton` получил отдельный focus-visible ring, не дублирующий selected-state.
- [x] #22 P3 — русская терминология нормализована: composer/controls/image wall/batch заменены на пользовательские русские термины.
- [x] #23 P3 — info page визуально облегчена: сильный контейнер оставлен hero, quick/guides стали типографичнее.
- [x] #24 P3 — счётчик галереи перенесён в title row `Изображения · N`; header actions теперь не группируют metadata и destructive action.

## Реализованные изменения

### Gallery

- Empty state расширен до onboarding-карточки с CTA.
- CTA фокусирует существующий `composer-prompt`, без нового route/state в gallery context.
- Header title теперь содержит count metadata рядом с названием.
- `gallery.resultCount` убран из `gallery/header-actions` placement.

### Sidebar / shell

- `--sidebar-width-expanded` уменьшен до `clamp(260px, 19vw, 288px)`.
- Для desktop ниже `1180px` expanded sidebar становится `248px`.
- Collapsed режим не тронут.

### Theme grid

- Desktop grid: 3 колонки на обычной ширине, 5 колонок только от `1760px`.
- Mobile theme strip получил scroll snap center, edge fade и sticky arrow hint.

### Contrast / focus / disabled

- Во всех темах повышены `--muted` и `--faint`.
- Глобальное `button:disabled` больше не задаёт opacity всего control.
- Shared `Button` disabled state теперь readable-neutral.
- `NavigationButton` различает selected и keyboard focus через внешний ring.

### RU terminology / info page

- В ru i18n заменены пользовательские термины: `composer`, `controls`, `image wall`, `batch`.
- Technical terms сохранены там, где они действительно технические (`endpoint`, `payload` в API/JSON контексте).
- Info page CSS упрощён: quick items стали line-based, guide articles — типографическими секциями вместо вложенных карточек.

### Visual QA

- Добавлен scenario-level `seedTasks` в screenshot runner.
- Добавлен сценарий `gallery-empty`, проверяющий empty state без пост-загрузочных localStorage-хаков.

## Debt gate result

- [x] Owner boundaries сохранены.
- [x] Global changes ограничены theme/shell/shared primitive tokens.
- [x] Definition/Placement не обойдены; header count стал частью owner header, а не отдельной action placement.
- [x] I18n parity сохранён.
- [x] Debt budgets не выросли сверх caps.
- [x] Screenshot runner получил явный initial-state contract вместо хрупкого reload-after-clear.

## Проверки

- [x] `npm run verify:static` — passed.
- [x] `npm run build` — passed внутри `verify:static` и visual capture.
- [x] `npm run ui:check` — passed.
- [x] `npm run css:check` — passed.
- [x] `npm run debt:check` — passed.
- [x] `npm run motion:check` — passed.
- [x] `npm run arch:check:strict` — passed.
- [x] `npm run imports:check` — passed.
- [x] `npm run interface:check` — passed.
- [x] `npm run params:check` — passed.
- [x] `npm run providers:check` — passed.
- [x] `npm run tasks:check` — passed.
- [x] `npm run storage:check` — passed.
- [x] `npm run secrets:check` — passed.
- [x] `npm test` — passed, 42 tests.
- [x] Targeted visual capture — 12 screenshots: desktop/mobile × gallery, gallery-empty, settings-interface, info, sidebar-collapsed, settings-api.
- [x] Targeted `check-screenshot-artifacts` — passed.

## Примечания по visual verification

Chromium policy была временно снята для локального screenshot capture и возвращена после проверки. Первый экспериментальный `gallery-empty` capture показал, что localStorage-clear после старта не работает из-за `evaluateOnNewDocument` seed; поэтому был добавлен явный `scenario.seedTasks` contract и сценарий успешно прошёл.

## Что осталось на финальную приёмку

- Полный matrix по `360 × 800`, `390 × 844`, `820 × 1180`, `1440 × 1000`, `1920 × 1080`.
- Ручной проход по всем пяти темам и keyboard-only navigation.
- Итоговая таблица 24 пунктов с подтверждением screenshots/manual review.
