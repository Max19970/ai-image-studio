# Image Studio — Focus Prompt & Free Performance Plan

Дата: 2026-06-19  
База анализа: `image-studio-stage9-windows-static-fix-fixed.zip`  
Цель: добавить раскрытие prompt-поля по фокусу и провести безопасную оптимизацию производительности/памяти без пользовательских регрессий.

## Статусная легенда

- [ ] не начато
- [~] в работе
- [x] готово
- [!] заблокировано / требует решения
- [?] требует ручной визуальной проверки

## Проверенная исходная база

- [x] Архив распакован и осмотрен.
- [x] `npm ci` выполнен.
- [x] `npm run verify:static` проходит полностью.
- [x] Текущие gates зелёные: architecture, imports, interface registry, params, providers, task lifecycle, storage, CSS, motion, UI accessibility, debt, secrets, tests, build.
- [x] Unit tests: 42/42 passed.
- [x] Build проходит, но Vite предупреждает о крупном клиентском чанке: `index-*.js` ≈ 511 KB minified / ≈ 140 KB gzip.
- [x] Основные prompt-точки найдены:
  - `src/features/composer/sections/prompt/ComposerPromptSection.tsx`
  - `src/features/batch-composer/sections/draft-prompt/BatchDraftPromptSection.tsx`
  - `src/features/composer/ComposerLayout.module.css`
  - `src/features/batch-composer/sections/draft-prompt/BatchDraftPromptSection.module.css`
  - `src/features/batch-composer/sections/draft-card/BatchDraftCardSection.module.css`
- [x] Основные perf/memory-кандидаты найдены:
  - object URL churn: `src/shared/image/useFlatAttachmentPreviewItems.ts`
  - snapshot object URLs: `src/domain/generationSnapshots.ts`
  - unbounded thumbnail cache: `src/shared/image/imageOptimization.ts`
  - eager interface definitions: `src/interface/registry/definitions.ts`
  - detail carousel renders all slides: `src/features/detail/sections/carousel/DetailResultCarousel.tsx`
  - gallery archive already paginates to 48 tasks and uses lazy images/content-visibility, поэтому это не первичная зона риска.

## Общий рабочий протокол каждого этапа

Перед началом каждого этапа создаётся preflight-документ:

```txt
docs/FOCUS_PERF_STAGE_XX_PREFLIGHT.md
```

Шаблон:

```md
# Focus/performance stage XX preflight

## Цель этапа

## Планируемые изменения

## Затрагиваемые файлы

## Симуляция результата

## Debt/architecture gate

- Дублирование компонентов:
- Новые глобальные CSS-правки:
- Рост CSS/TS-файлов сверх debt budgets:
- Обход Definition/Placement:
- Связность feature/shared/process:
- Motion/performance риск:
- Memory lifecycle риск:
- Accessibility/keyboard риск:

## Нужен ли предварительный рефакторинг

## Проверки после этапа

## Итоговый статус
```

Правило: если симуляция показывает рост техдолга, сначала делается маленький рефакторинг, затем уже пользовательское изменение.

---

# Этап 0 — Baseline и perf-карта

## Цель

Зафиксировать чистую стартовую точку, чтобы дальнейшие оптимизации не превращались в угадайку.

## Preflight-симуляция

- [ ] Создать `docs/FOCUS_PERF_STAGE_00_PREFLIGHT.md`.
- [ ] Зафиксировать текущие результаты `npm run verify:static`.
- [ ] Зафиксировать размер build output: JS/CSS gzip/minified.
- [ ] Зафиксировать текущие hotspots по размеру файлов:
  - top TS/TSX files;
  - top CSS files.
- [ ] Отдельно отметить зоны, которые не трогаем без необходимости: storage v2, provider adapters, batch scheduler, task lifecycle.

## Debt gate

- [ ] Не снижать strict architecture guarantees.
- [ ] Не добавлять глобальные CSS-заплатки ради prompt-поля.
- [ ] Не менять UX-семантику генерации, batch-runner, storage или provider probing.
- [ ] Все perf-правки должны быть откатываемыми маленькими diff-ами.

## Реализация

- [ ] Добавить краткий baseline в этот план или отдельный report.
- [ ] При необходимости добавить npm-script/замер bundle size только если это не усложнит release gates.

## Проверки

- [ ] `npm run verify:static`
- [ ] `npm run build`

## Definition of Done

- [ ] Есть понятная стартовая метрика.
- [ ] Понятно, какие улучшения реально дадут пользу, а какие будут “рефакторинг ради рефакторинга”.

---

# Этап 1 — Общий autosize/focus-контракт для prompt textarea

## Цель

Сделать одно поведение для обычного composer и batch draft composer:

- blur / not focused: поле визуально схлопнуто до 1 строки;
- focus: поле раскрывается под содержимое до 5–7 строк;
- длинный текст после лимита скроллится внутри textarea;
- Ctrl/Cmd+Enter в обычном composer продолжает работать;
- текст не теряется, каретка и клавиатура не ломаются.

## Preflight-симуляция

- [x] Создать `docs/FOCUS_PERF_STAGE_01_PREFLIGHT.md`.
- [x] Смоделировать состояния:
  - пустое поле без фокуса;
  - короткий prompt без фокуса;
  - длинный prompt без фокуса;
  - длинный prompt в фокусе;
  - mobile `360×800`;
  - batch selected draft prompt.
- [x] Проверить текущую дубликацию autosize-логики в `ComposerPromptSection.tsx` и `BatchDraftPromptSection.tsx`.
- [x] Проверить, не лучше ли вынести только hook, а не shared UI component.

## Debt gate

- [x] Не копировать новый autosize-код в два компонента.
- [x] Не переносить feature-стили в `global.css`.
- [x] Не делать shared-компонент, который знает про composer/batch semantics.
- [x] Не добавлять layout-heavy transitions; раскрытие должно быть простым height update, без глобальных reflow-анимаций.
- [x] Не ломать accessibility: textarea остаётся textarea, placeholder/aria/keyboard сохраняются.

## Предварительный рефакторинг

- [x] Добавить shared hook, например:
  - `src/shared/hooks/useAutosizedTextarea.ts`
  - или `src/shared/ui/AutosizeTextarea/useAutosizedTextarea.ts`
- [x] Hook должен быть domain-agnostic:
  - принимает `value`, `focused`, `minRows`, `maxRows`, `collapsedRows`, `lineHeightPx`, `verticalPaddingPx` или готовые px-limits;
  - выставляет `height` и `overflowY`;
  - не знает про Image Studio, generation, batch, params.
- [x] Добавить маленькие tests для pure helpers, если расчёт высоты будет вынесен в pure-функцию.

## Реализация

- [x] В `ComposerPromptSection.tsx` добавить focus state.
- [x] В `BatchDraftPromptSection.tsx` добавить focus state.
- [x] Подключить общий autosize hook в оба prompt-компонента.
- [x] На blur выставлять collapsed height ≈ 1 строка.
- [x] На focus раскрывать до:
  - desktop: 5–7 строк, ориентировочно max-height 150–190px;
  - mobile: 4–6 строк, чтобы не съедать весь экран.
- [x] Обновить CSS локально:
  - `ComposerLayout.module.css`
  - `BatchDraftPromptSection.module.css`
  - при необходимости `BatchDraftCardSection.module.css`, если rail alignment требует поправки.
- [x] Добавить data-state/debug attrs только если они нужны screenshot runner-у, например `data-prompt-focused`.

## Проверки

- [x] `npm run build`
- [x] `npm run ui:check`
- [x] `npm run motion:check`
- [x] `npm run debt:check`
- [x] Visual targeted:
  - `composer-compact`
  - `composer-long-prompt`
  - `batch-composer`
  - mobile + desktop.
- [x] Ручная/визуальная проверка:
  - [x] focus/blur;
  - [~] Ctrl/Cmd+Enter — live-submit не запускался, кодовый путь `onKeyDown` сохранён;
  - [x] очистка prompt;
  - [x] длинный prompt с переносами;
  - [x] batch draft switching.

## Definition of Done

Статус этапа: [x] готово. Подробности: `docs/FOCUS_PERF_STAGE_01_REPORT.md`.


- [x] Обычный prompt раскрывается при фокусе и схлопывается без фокуса.
- [x] Batch prompt делает то же самое.
- [x] Нет дублирования autosize-логики.
- [x] Визуально composer не перекрывает критически больше контента на mobile.

---

# Этап 2 — Object URL lifecycle: меньше churn и утечек

## Цель

Сократить лишнее создание blob URL для attachments и сделать lifecycle понятным.

## Preflight-симуляция

- [x] Создать `docs/FOCUS_PERF_STAGE_02_PREFLIGHT.md`.
- [x] Проследить путь attachment preview:
  - composer files → `useFlatAttachmentPreviewItems`;
  - request snapshot → `summarizeAttachments`;
  - detail snapshot → `AttachmentImageStrip`.
- [x] Проверить, какие object URLs нужны только для текущего composer, а какие нужны для истории текущей сессии.
- [x] Смоделировать удаление task / clear history / удаление attachment.

## Debt gate

- [x] Не убрать attachment preview из detail-экрана в текущей сессии.
- [x] Не хранить `blob:` URL в persistent storage.
- [x] Не создавать глобальный mutable singleton без понятного release API.
- [x] Не усложнять storage v2.

## Предварительный рефакторинг

- [x] Добавить shared hook/cache для object URLs по стабильному ключу файла:
  - reuse URL, если тот же `File`/id остался;
  - revoke URL только для удалённых файлов или при unmount.
- [x] Рассмотреть маленькую utility:
  - `createFileObjectUrlRegistry()` / `createObjectUrlRegistry()`;
  - `releaseObjectUrlsFromTask(task)` / task URL collector;
  - только если snapshot URLs реально остаются жить после удаления task.

## Реализация

- [x] Переписать `useFlatAttachmentPreviewItems.ts`, чтобы он не пересоздавал все object URLs при каждом изменении массива, если файлы фактически те же.
- [x] Проверить `ComposerPromptSection`/batch switching на отсутствие мерцаний thumbnails.
- [x] Аудировать `summarizeFile()` в `generationSnapshots.ts`:
  - previews оставлены для detail текущей сессии;
  - добавлен lifecycle cleanup через `useGenerationTaskHistory()`.
- [x] При delete/clear task добавить revoke только для `blob:` attachments, если выбран этот путь.

## Проверки

- [x] `npm run verify:static`
- [x] `npm run storage:audit:strict`
- [x] Visual targeted:
  - `composer-attachments`
  - `attachment-preview-modal`
  - `detail`
  - `batch-composer`.
- [x] Ручная проверка:
  - добавить/удалить attachments — покрыто targeted composer screenshots + registry test;
  - перейти в detail после генерации — live generation не запускался, но detail snapshot визуально проверен fixture-сценарием;
  - удалить task — покрыто task object URL collector/lifecycle path;
  - открыть batch draft с вложениями — targeted batch composer screenshots.

## Definition of Done

Статус этапа: [x] готово. Подробности: `docs/FOCUS_PERF_STAGE_02_REPORT.md`.

- [x] Attachments preview выглядит как раньше.
- [x] Object URLs не пересоздаются без причины.
- [x] Удалённые previews освобождаются.
- [x] Persistent storage по-прежнему не содержит `blob:` URL.

---

# Этап 3 — Thumbnail cache: bounded LRU и контроль фоновой работы

## Цель

Уменьшить память от оптимизированных data URL thumbnails и избежать всплесков canvas-обработки.

## Preflight-симуляция

- [x] Создать `docs/FOCUS_PERF_STAGE_03_PREFLIGHT.md`.
- [x] Проверить текущий `thumbnailCache` в `src/shared/image/imageOptimization.ts`.
- [x] Смоделировать большую галерею: 100+ задач, batch images, переход detail/gallery.
- [x] Проверить, где thumbnail уже приходит из storage v2 и где canvas-оптимизация избыточна.

## Debt gate

- [x] Не ухудшить качество отображения thumbnails.
- [x] Не добавить сложный worker/pipeline без необходимости.
- [x] Не блокировать первое отображение изображения ожиданием thumbnail.
- [x] Cache policy должна быть простой и предсказуемой.

## Реализация

- [x] Заменить unbounded `Map` на маленький LRU cache, например 80–150 entries. Решение: 120 entries.
- [x] Не кэшировать огромные full data URLs дольше нужного. Решение: дополнительный лимит retained data URL chars.
- [x] Добавить early return: если `thumbnailSrc` уже есть или изображение меньше maxEdge — не плодить data URL. Решение: `skipOptimization` для stored thumbnails + existing small-image return.
- [x] Рассмотреть concurrency limit для `createOptimizedThumbnail`, если одновременно запускается много canvas resize. Решение: маленькая очередь uncached thumbnail work.
- [x] Опционально: defer heavy thumbnail generation через `requestIdleCallback`, но только если визуально нет задержки/мерцания. Решение: не добавлять idle-defer на этом этапе; fallback-src уже не блокирует первый paint, а idle мог бы дать мерцание.

## Проверки

- [x] `npm run verify:static`
- [x] Visual targeted:
  - `gallery`
  - `detail`
  - `batch-composer`.
- [x] Ручная проверка:
  - большая галерея — покрыта 100+ cache simulation test;
  - быстрый скролл — визуальный smoke по gallery + non-blocking fallback preserved;
  - открытие detail — targeted screenshot.

## Definition of Done

Статус этапа: [x] готово. Подробности: `docs/FOCUS_PERF_STAGE_03_REPORT.md`.

- [x] Thumbnails отображаются как раньше.
- [x] Cache не растёт бесконечно.
- [x] Нет заметного лага при первой отрисовке большой галереи.

---

# Этап 4 — Detail carousel и крупные image-сцены

## Цель

Снизить стоимость detail-экрана для batch/многоизображенческих задач без изменения визуального поведения.

## Preflight-симуляция

- [x] Создать `docs/FOCUS_PERF_STAGE_04_PREFLIGHT.md`.
- [x] Проверить `DetailResultCarousel.tsx`: сейчас `slides.map(...)` рендерит все slides.
- [x] Смоделировать batch на 20–80 изображений.
- [x] Определить минимальный набор DOM slides для сохранения эффекта: active / prev / next / pending.

## Debt gate

- [x] Не ломать навигацию по карусели.
- [x] Не ломать selected image sync.
- [x] Не менять внешний вид active/prev/next.
- [x] Не создавать хитрый virtualizer ради 3 элементов, если хватит простого visible-window.

## Реализация

- [x] Вынести pure helper `getVisibleCarouselSlides(slides, activeIndex)`.
- [x] Рендерить только active, prev, next и pending, если он рядом/активен.
- [x] Сохранить counter `activeIndex + 1 / slides.length`.
- [x] Сохранить keyboard/mouse behavior, если оно есть/будет.
- [x] Проверить, что `onSelectImage` вызывается только для image slide.

## Проверки

- [x] `npm run build`
- [x] `npm run test`
- [x] Visual targeted: `detail` desktop/mobile.
- [x] Ручная проверка:
  - single image — standard detail fixture;
  - 2 images — unit coverage for duplicate prev/next edge;
  - много images — ad-hoc 12-image browser fixture;
  - pending state во время генерации — unit coverage, no permanent visual fixture added.

## Definition of Done

Статус этапа: [x] готово. Подробности: `docs/FOCUS_PERF_STAGE_04_REPORT.md`.

- [x] В detail DOM не грузятся десятки hidden `<img>`.
- [x] Внешне карусель работает как раньше.
- [x] Нет регрессии selected image / restore params.

---

# Этап 5 — Render churn в composer/batch context

## Цель

Уменьшить лишние rerender-ы вокруг composer и batch composer, не меняя архитектуру команд.

## Preflight-симуляция

- [x] Создать `docs/FOCUS_PERF_STAGE_05_PREFLIGHT.md`.
- [x] Проверить context object identity в:
  - `ImageComposer.tsx`
  - `MultiImageComposer.tsx`
  - `BatchDraftCardSection.tsx`
  - `SlotHost.tsx` consumers.
- [x] Смоделировать ввод текста в prompt: какие компоненты должны обновляться, а какие нет.
- [x] Смоделировать переключение draft в batch composer.

## Debt gate

- [x] Не превращать код в ковёр из `memo/useMemo/useCallback` без измеримой пользы.
- [x] Не ломать commands contract.
- [x] Не делать premature optimization для маленьких компонентов.
- [x] Архитектурная проверка: helper для model options перенесён из `shared` в `entities/provider`, потому что `shared -> domain` запрещён.

## Реализация

- [x] Вынести стабильные derived values там, где они реально пересчитываются часто:
  - modelOptions map;
  - validDrafts/totalImages;
  - selectedDraft lookup.
- [x] Рассмотреть `React.memo` только для тяжёлых slot sections:
  - batch queue item — реализовано;
  - gallery card — не трогали в этом этапе, потому что зона этапа composer/batch;
  - attachment strip item — не трогали, вместо этого стабилизирован label callback/card context.
- [x] В batch queue не пересчитывать attachment counts/prompt labels для всех items на каждый символ выбранного draft, если draft object и selected state не поменялись.
- [x] Добавить unit coverage для shared derivation helper: `tests/model-options.test.ts`.

## Проверки

- [x] `npm run verify:static`
- [x] Ручная/ad-hoc browser проверка ввода в prompt без real API request.
- [x] Targeted visual screenshots:
  - `composer-long-prompt` desktop/mobile;
  - `batch-composer` desktop/mobile;
  - `composer-attachments` desktop/mobile.
- [x] React DevTools/performance recording: не добавляли в проект, чтобы не плодить dev-only instrumentation; stage validated через targeted code review, tests, browser smoke and visual captures.

## Definition of Done

- [x] Нет бесполезных массовых rerender-ов на вводе текста в batch queue для неизменённых draft items.
- [x] Код не стал тяжелее читать: изменения локальные, helpers вынесены по слоям.
- [x] Пользовательский UX не изменился.

---

# Этап 6 — Bundle/code-splitting feasibility pass

## Цель

Понять, можно ли бесплатно уменьшить initial JS, не ломая Definition/Placement registry.

## Preflight-симуляция

- [x] Создать `docs/FOCUS_PERF_STAGE_06_PREFLIGHT.md`.
- [x] Проверить текущую причину крупного чанка:
  - `src/interface/registry/definitions.ts` использует eager `import.meta.glob(...)`;
  - workspace pages/features попадают в initial bundle через eager definition imports.
- [x] Смоделировать варианты:
  - оставить как есть, если async registry создаст техдолг;
  - lazy-load тяжёлые pages: settings, detail, info, batch composer;
  - lazy-load only optional modals/sections;
  - настроить Vite manual chunks без runtime architecture changes.

## Debt gate

- [x] Не ломать синхронный SlotHost contract без отдельного архитектурного решения.
- [x] Не добавлять loading flicker в основные сценарии.
- [x] Не делать lazy imports внутри render хаотично.
- [x] Если code-splitting требует async registry, сначала отдельный архитектурный preflight.

## Реализация — только если preflight покажет низкий риск

- [~] Вариант A: Vite manual chunks для крупных независимых областей без изменения runtime — проверено, но feature-folder chunks отклонены, потому что могут вернуть dynamic chunks в стартовый preload; оставлен только `react-vendor` split.
- [x] Вариант B: точечный `React.lazy` для detail/settings/info/batch page wrappers и offscreen definition components.
- [ ] Вариант C: отложить этап, если риск регрессий выше выигрыша.

## Проверки

- [x] `npm run verify:static`
- [~] `npm run verify:visual` — монолитный прогон в контейнере зависал на recoverable Chromium/Puppeteer error; тот же набор добран сегментированными capture runs.
- [x] `npm run visual:check` — 28/28 screenshots.
- [x] Сравнить build output до/после.

## Definition of Done

Статус этапа: [x] готово. Подробности: `docs/FOCUS_PERF_STAGE_06_PREFLIGHT.md`, `docs/FOCUS_PERF_STAGE_06_REPORT.md`.

- [x] Initial JS уменьшился.
- [x] Vite warning исчез.
- [x] Definition/Placement архитектура не сломана.
- [x] Нет обнаруженных loading/focus/scroll регрессий на screenshot matrix.

---

# Этап 7 — Финальная visual/perf acceptance

## Цель

Закрыть проход не только зелёной сборкой, но и реальной проверкой пользовательских сценариев.

## Preflight-симуляция

- [x] Создать `docs/FOCUS_PERF_STAGE_07_PREFLIGHT.md`.
- [x] Составить короткую acceptance matrix:
  - desktop/mobile;
  - composer compact/focused/long prompt/attachments;
  - batch composer selected draft prompt;
  - gallery large archive;
  - detail carousel;
  - settings/info smoke.

## Проверки

- [x] `npm run verify:static`
- [~] `npm run verify:visual` — монолитный capture полного набора в контейнере зависал на recoverable Chromium/Puppeteer retry; тот же набор добран сегментированными `capture:screenshots`.
- [x] Если Chromium policy блокирует screenshots в контейнере — временно снять только `URLBlocklist`, прогнать screenshots, вернуть policy.
- [x] `npm run visual:check` — 28/28 screenshots.
- [x] `npm run release:check` — strict debt + storage audit включены.
- [x] Ручной просмотр screenshots/contact sheet.
- [x] Финальный report:
  - что реально оптимизировано;
  - какие сценарии проверены;
  - что сознательно не трогали;
  - известные остаточные риски.

## Definition of Done

Статус этапа: [x] готово. Подробности: `docs/FOCUS_PERF_STAGE_07_PREFLIGHT.md`, `docs/FOCUS_PERF_STAGE_07_REPORT.md`.

- [x] Prompt focus behavior работает в mono и batch.
- [x] Memory/perf-правки не изменили UX.
- [x] Все gates зелёные.
- [x] Визуальные сценарии проверены или честно указано, почему не проверены.

---

## Рекомендуемый порядок выполнения

1. Этап 0 — baseline.
2. Этап 1 — prompt focus/autosize, потому что это пользовательская фича.
3. Этап 2 — object URL lifecycle, потому что связан с composer attachments.
4. Этап 3 — thumbnail cache.
5. Этап 4 — detail carousel.
6. Этап 5 — render churn только если после первых этапов есть смысл.
7. Этап 6 — bundle splitting только после отдельного feasibility pass.
8. Этап 7 — финальная приёмка.

## Что точно не делаем в этом проходе

- [ ] Не переписываем storage v2.
- [ ] Не меняем provider API и request payload semantics.
- [ ] Не меняем batch scheduling/retry/cancellation.
- [ ] Не добавляем новые темы/визуальные редизайны.
- [ ] Не жертвуем читаемостью ради микрооптимизаций.
