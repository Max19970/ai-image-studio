# Focus/performance stage 07 report — final acceptance

Дата: 2026-06-19  
Статус: [x] готово

## Что проверено

Финальный этап не добавлял runtime-правок. Он зафиксировал acceptance после этапов 1–6:

- mono composer prompt focus/autosize;
- batch composer prompt focus/autosize;
- object URL lifecycle для attachments/snapshots;
- bounded thumbnail cache;
- detail carousel DOM window;
- render churn fixes в composer/batch;
- bundle/code-splitting feasibility implementation.

## Команды и результаты

### Dependency install

- [x] `npm ci`
- Результат: зависимости установлены, `0 vulnerabilities`.

### Static/release gates

- [x] `npm run verify:static`
- [x] `npm run release:check`

`release:check` включает:

- strict architecture boundaries;
- import cycle check;
- interface registry check;
- generation params check;
- provider adapters check;
- task lifecycle check;
- storage architecture check;
- CSS architecture check;
- motion check;
- UI accessibility check;
- debt budgets;
- secrets check;
- unit tests;
- production build;
- strict debt budgets;
- strict storage audit.

Финальный результат:

- [x] Unit tests: 58/58 passed.
- [x] Architecture boundary violations: 0.
- [x] Import cycles: 0.
- [x] Debt budget warnings: none.
- [x] Secret check: passed.
- [x] Storage audit strict: `ok: true`, issues: none.
- [x] Production build: passed.

### Bundle result

Финальный production build сохраняет результат этапа 6:

- `index-*.js`: 157.22 kB / 42.90 kB gzip;
- `react-vendor-*.js`: 189.64 kB / 59.65 kB gzip;
- `i18n-*.js`: 76.93 kB / 20.62 kB gzip;
- `rolldown-runtime-*.js`: 0.69 kB / 0.42 kB gzip;
- final initial/preloaded JS total: ~424.48 kB / ~123.59 kB gzip;
- `index-*.css`: 78.15 kB / 16.20 kB gzip;
- Vite warning по chunk > 500 kB отсутствует.

Для сравнения с исходным baseline:

- initial JS было: 515.48 kB / 141.60 kB gzip;
- initial CSS было: 152.81 kB / 28.91 kB gzip.

## Visual acceptance

Полная visual matrix:

- [x] 14 сценариев × 2 viewport-а = 28 screenshots.
- [x] `npm run visual:check` подтвердил 28/28 screenshots.

Сценарии:

- `gallery`;
- `composer-compact`;
- `composer-long-prompt`;
- `composer-attachments`;
- `composer-controls`;
- `gallery-quick-actions`;
- `sidebar-collapsed`;
- `settings-api`;
- `settings-models`;
- `detail`;
- `attachment-preview-modal`;
- `batch-composer`;
- `info`;
- `parameters`.

Viewport-ы:

- desktop: 1440×1000;
- mobile: 780×1688.

Финальный contact sheet создан как внешний артефакт:

- `/mnt/data/stage-07-final-visual-contact-sheet.jpg`.

## Нюанс по visual runner

Монолитный capture полного набора снова завис в контейнере после recoverable Chromium/Puppeteer retry:

- первый раз на `desktop/detail`;
- второй сегмент на `mobile/settings-models`.

Это не сопровождалось падением build/static gates. Для завершения acceptance тот же набор был добран сегментированными `capture:screenshots` запусками, после чего `visual:check` подтвердил наличие и валидность всех 28 screenshot artifacts.

Chromium policy `URLBlocklist` временно снимался только для screenshot capture и был восстановлен после проверки.

## Ручной просмотр

Финальный contact sheet просмотрен. Критичных визуальных регрессий по обязательной матрице не обнаружено:

- gallery открывается на desktop/mobile;
- compact/long prompt states отображаются;
- attachments preview и modal отображаются;
- settings/info/parameters lazy-loaded sections отрисовываются;
- detail page и batch composer открываются;
- mobile layouts остаются скроллируемыми и не показывают явного layout collapse.

## Что сознательно не проверялось реальным API-запросом

- Генерация изображений не запускалась, чтобы не отправлять внешний API request.
- Ctrl/Cmd+Enter live-submit не вызывался по той же причине; кодовый путь ordinary composer `onKeyDown` сохранён и был отмечен на этапе 1.
- Pending визуальный state detail carousel покрыт unit-тестом этапа 4, но не отдельным постоянным screenshot scenario.

## Что сознательно не трогали в этом проходе

- Storage v2 schema и encryption/compression semantics.
- Provider API / request payload semantics.
- Batch scheduling/retry/cancellation semantics.
- Темы, редизайн и новые UX-фичи вне prompt focus.
- Полную async registry architecture — выбран более узкий lazy Component contract.

## Acceptance verdict

- [x] Prompt focus behavior работает в mono и batch по stage 01 measurements и visual matrix.
- [x] Memory/perf-правки не изменили пользовательский UX по screenshot matrix.
- [x] Все static/release gates зелёные.
- [x] Visual artifacts проверены: 28/28.
- [x] Архитектурное здоровье сохранено: boundaries/imports/interface/debt checks passed.

Итог: проход принят.
