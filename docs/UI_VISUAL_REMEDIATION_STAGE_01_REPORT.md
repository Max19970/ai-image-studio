# UI remediation stage 01 report

Дата: 2026-06-19

## Статус

Этап 1 выполнен по preflight-протоколу. Перед визуальными правками сделан локальный рефакторинг screenshot runner и `BottomSheet`, чтобы не наращивать brittle-сценарии и one-off CSS для каждого overlay.

## Закрытые проблемы аудита

- [x] #1 P1 — mobile composer + bottom navigation занимают меньше полезной области.
- [x] #2 P1 — mobile clear-results больше не выглядит как закрытие страницы, получил danger-семантику, доступное имя и confirm.
- [x] #3 P1 — composer controls теперь ограничены viewport, desktop popover скроллится внутри, mobile sheet стал компактнее и получил scroll hint.
- [x] #4 P1 — gallery preview больше не режет результат через `object-fit: cover`; используется safe contain.
- [x] #5 P1 — visual QA обновлён под актуальный интерфейс и больше не fail-fast по первому сценарию.

## Реализованные изменения

### Visual QA

- Заменён устаревший scenario `composer-expanded` на `composer-compact`, который проверяет актуальный `data-composer-expanded="false"`.
- `attachment-preview-modal` теперь сначала открывает вкладку файлов на detail-экране.
- `capture-app.mjs` собирает ошибки по всем scenarios/viewports и печатает итоговую сводку.
- Расширен recoverable список ошибок Chromium: добавлен `Navigating frame was detached`.
- `verify:visual`, `visual:check` и `check-screenshot-artifacts.mjs` синхронизированы на список из 13 сценариев.
- Добавлен стабильный `data-testid="composer-dock"`.

### Mobile shell / composer

- Централизованно уменьшены mobile shell variables:
  - `--mobile-bottom-nav-height: 62px`;
  - `--mobile-bottom-nav-space: calc(... + 10px)`;
  - `--mobile-composer-space: 126px`.
- Bottom navigation стала ниже и компактнее без изменения placement-архитектуры.
- Composer dock на mobile уменьшен по padding/max-height.
- Composer скрывается, когда открыт batch composer.
- Attachment strip на mobile стал компактнее: thumbnails 52–56px, один файл больше не создаёт широкую пустую полосу.

### Overlay contract

- `BottomSheet` получил:
  - `size="compact"`;
  - `compactHeader`;
  - `scrollHint`.
- Quick actions sheet использует content-sized compact mode.
- Composer controls sheet использует compact header + scroll hint.
- Desktop composer popover получил `max-height` от `--floating-available-height` и внутренний scroll.

### Gallery

- Clear action на mobile заменён на icon-only danger кнопку с корзиной, `aria-label="Удалить все результаты"` и confirm с количеством элементов.
- Gallery preview переключён на `object-fit: contain`.
- Error card на mobile показывает короткое описание ошибки через line clamp.

## Debt gate result

- [x] Definition/Placement не обойдены.
- [x] Новые сценарии не завязаны на CSS Modules.
- [x] Общая overlay-логика вынесена в shared `BottomSheet`, а не размазана по feature CSS.
- [x] Глобальные CSS-правки ограничены shell variables.
- [x] Motion-heavy transitions не добавлялись.
- [x] Touch target clear-results на mobile не меньше 44×44px.

## Проверки

- [x] `npm run build` — passed.
- [x] `npm run ui:check` — passed.
- [x] `npm run css:check` — passed.
- [x] `npm run debt:check` — passed.
- [x] `npm run motion:check` — passed.
- [x] `npm run arch:check:strict` — passed.
- [x] `npm run imports:check` — passed.
- [x] Visual capture создан для 26 screenshots: 2 viewport × 13 scenarios.
- [x] `npm run visual:check` — passed.

## Примечания по visual verification

В контейнере Chromium policy временно снималась по уже зафиксированному проектному гайду, затем была возвращена. Из-за длительности полного `verify:visual` прогон был добран частями, но итоговый artifact-check проверил полный ожидаемый набор из 26 screenshots.

## Что сознательно оставлено на следующие этапы

- Batch mobile title всё ещё сокращается до «Мульти» — это входит в следующий этап mobile-композиции.
- Detail actions/topbar ещё требуют отдельной переработки иерархии.
- Empty gallery CTA и перенос счётчика к заголовку не трогались в этом этапе.
- Полноценный aspect-ratio/masonry по metadata не внедрялся; выбран безопасный contain-вариант без доменной миграции.
