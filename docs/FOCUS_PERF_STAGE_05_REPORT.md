# Focus/performance stage 05 report

## Статус

Завершено.

## Что изменено

- Добавлен `src/shared/hooks/useEventCallback.ts` для стабильных UI event callbacks без изменения command contract.
- Добавлен `src/entities/provider/modelOptions.ts`:
  - `getProviderModelOptions(...)` строит options через provider lookup-table вместо повторяющихся `providers.find(...)`;
  - `getSelectedModel(...)` централизует fallback selected model.
- `ImageComposer.tsx`:
  - command callbacks стабилизированы на границе компонента;
  - selected model и model options вынесены в memoized helpers;
  - attachment label callback больше не пересоздаётся на каждый prompt render.
- `MultiImageComposer.tsx`:
  - command callbacks стабилизированы;
  - `totalImages`, `validDrafts`, `selectedDraftIndex` теперь memoized;
  - `context.actions` вынесен в отдельный stable `useMemo`.
- `BatchDraftListSection.tsx`:
  - queue item вынесен в memoized `BatchQueueItem`;
  - unaffected queue items могут пропускать rerender, если draft object/selected/index/t/onSelect не изменились;
  - selected draft lookup/context preparation стали явнее.
- `BatchDraftCardSection.tsx`:
  - attachment label callback стабилизирован;
  - remove attachment handler и card context мемоизированы.
- `BatchDraftToolbarSection.tsx`:
  - локальный `matchMedia` hook заменён на общий `useMediaQuery`.
- Добавлены unit tests для model option helper.

## Архитектурная проверка во время этапа

В первой симуляции helper был помещён в `shared/provider`, но `arch:check:strict` поймал нарушение `shared -> domain`.

Исправление до продолжения работ:

- helper перенесён в `src/entities/provider/modelOptions.ts`;
- imports обновлены;
- `arch:check:strict` после этого прошёл без нарушений.

## Что сознательно не трогали

- app command factories;
- batch scheduler/retry/cancellation;
- storage v2;
- provider request/response adapters;
- SlotHost/Definition/Placement runtime;
- gallery card virtualization.

## Проверки

- `npm run verify:static` — passed.
- `npm test` внутри static gate — 58/58 passed.
- `npm run build` внутри static gate — passed.
- Targeted screenshots:
  - `composer-long-prompt` desktop/mobile;
  - `batch-composer` desktop/mobile;
  - `composer-attachments` desktop/mobile.
- Screenshot artifact check — 6/6 passed.
- Ad-hoc browser typing smoke:
  - mono prompt typed and remained focused;
  - batch prompt typed and remained focused;
  - batch queue stayed mounted;
  - no real generation request was sent.

## Визуальная проверка

Скриншоты сохранены в:

- `artifacts/stage-05-visual`

Контакт-лист:

- `/mnt/data/stage-05-visual-contact-sheet.jpg`

Визуальных регрессий в targeted scenarios не обнаружено.

## Остаточные замечания

- Vite warning по initial chunk остаётся прежним: `index-*.js` около 515 KB minified / 141 KB gzip. Это не регрессия stage 05 и остаётся задачей stage 06.
- Этап не добавляет React Profiler instrumentation в проект, чтобы не создавать постоянный dev-only код ради одного прохода.
