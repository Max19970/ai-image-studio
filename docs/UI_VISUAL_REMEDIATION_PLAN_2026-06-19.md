# Image Studio — UI remediation plan

Дата: 2026-06-19  
Основание: `UI_VISUAL_AUDIT_2026-06-19.md` + статический осмотр архива `image-studio-stage-12-1-final-bugfixes.zip`.

## Статусная легенда

- [ ] не начато
- [~] в работе
- [x] готово
- [!] заблокировано / требует решения

## Ключевой принцип этого плана

Перед началом каждого этапа сначала выполняется **preflight-симуляция**:

1. описать предполагаемые изменения без правки кода;
2. перечислить файлы, которые будут затронуты;
3. оценить риск роста технического долга;
4. проверить, не создаём ли дублирование, новые глобальные CSS-заплатки, обход Definition/Placement, нестабильные screenshot-селекторы или тяжёлые transition-ы;
5. если риск высокий — сначала выполнить маленький архитектурный рефакторинг, затем уже делать визуальные правки;
6. после этапа заполнить чеклист и прогнать проверки.

Рекомендуемый формат preflight-документа для каждого этапа:

```txt
docs/UI_VISUAL_REMEDIATION_STAGE_XX_PREFLIGHT.md
```

Шаблон:

```md
# UI remediation stage XX preflight

## Цель этапа

## Проблемы из аудита

## Планируемые изменения

## Затрагиваемые файлы

## Симуляция результата

## Риск технического долга

- Дублирование компонентов:
- Новые глобальные CSS-правки:
- Рост CSS/TS-файлов сверх debt budgets:
- Обход Definition/Placement:
- Нестабильные test selectors:
- Производительность/motion:
- Accessibility/touch targets:

## Нужен ли предварительный рефакторинг

## Проверки после этапа

## Итоговый статус
```


## Progress update — Stage 01 executed on 2026-06-19

- [x] Stage 01 preflight-документ создан: `docs/UI_VISUAL_REMEDIATION_STAGE_01_PREFLIGHT.md`.
- [x] Debt gate пройден: Definition/Placement не обойдены, глобальные CSS-правки ограничены shell variables, shared overlay-правки вынесены в `BottomSheet`.
- [x] #5 P1 Visual QA: `composer-expanded` заменён на `composer-compact`, `attachment-preview-modal` исправлен, runner больше не fail-fast, `visual:check` синхронизирован с актуальным набором.
- [x] #1 P1 Mobile shell: composer/bottom-nav уплотнены через общий shell contract.
- [x] #3 P1 Composer controls: desktop popover ограничен viewport и скроллится; mobile sheet компактнее и со scroll hint.
- [x] #2 P1 Gallery clear action: mobile `×` заменён на корзину, добавлены accessible name и confirm с количеством элементов.
- [x] #4 P1 Gallery preview: превью переведены на safe contain-вариант без обрезки.
- [x] #12 P2 Attachment strip: один attachment больше не создаёт большую пустую полосу, thumbnails уплотнены.
- [x] #19 P2 Quick actions: bottom sheet стал content-sized compact.
- [x] Проверки: `build`, `ui:check`, `css:check`, `debt:check`, `motion:check`, `arch:check:strict`, `imports:check`, visual artifact check на 26 screenshots.
- [~] Ручная визуальная приёмка: просмотрены ключевые screenshots; оставшиеся композиционные пункты batch/detail/settings уходят в следующие этапы.



## Progress update — Stage 02 executed on 2026-06-19

- [x] Stage 02 preflight-документ создан: `docs/UI_VISUAL_REMEDIATION_STAGE_02_PREFLIGHT.md`.
- [x] Debt gate пройден: глобальные CSS layers не трогались, Definition/Placement сохранены, новый grouped copy action оформлен как `detail.copyMenu` definition.
- [x] #7 P2 Mobile settings: mobile hero уплотнён, API `Провайдеры / Модели` объединён с заголовком текущего списка.
- [x] #8 P2 Settings save state: clean-state save bar больше не занимает место; saved feedback автоскрывается.
- [x] #9 P2 Parameters desktop: modal больше не держит фиксированную высоту, используется content-driven `max-height`.
- [x] #10 P2 Parameters mobile: tabs компактнее, есть edge fade и auto-scroll active tab.
- [x] #12 P2 Attachments: compact thumbnails дополнительно уменьшены, tray ограничен по высоте.
- [x] #13 P2 Batch title: mobile title `Мульти` заменён на `Очередь`.
- [x] #14 P2 Batch layout: mobile footer перестал быть sticky-панелью над bottom nav, stage padding уменьшен.
- [x] #17 P2 Detail header: back/status отделены от readable title на mobile.
- [x] #18 P2 Detail actions: primary restore, secondary download, grouped `Копировать…` overflow menu.
- [x] Targeted visual verification: 14 screenshots для desktop/mobile × settings-api, settings-models, parameters, batch-composer, detail, composer-attachments, gallery-quick-actions.
- [x] Проверки: `build`, `ui:check`, `css:check`, `debt:check`, `motion:check`, `arch:check:strict`, `imports:check`, `interface:check`, `params:check`, `providers:check`, `tasks:check`, `storage:check`, `secrets:check`, `test`.
- [~] Остаётся на следующие этапы: #6 empty gallery CTA, #11 theme grid, #15 sidebar, #20 contrast, #21 focus states, #22 terminology, #23 info page, #24 gallery counter.

## Progress update — Stage 03 executed on 2026-06-19

- [x] Stage 03 preflight-документ создан: `docs/UI_VISUAL_REMEDIATION_STAGE_03_PREFLIGHT.md`.
- [x] Debt gate пройден: owner boundaries сохранены, global CSS изменён только на уровне shell/theme/shared primitive tokens, i18n parity зелёный.
- [x] #6 P2 Empty gallery: добавлен широкий onboarding empty state с CTA `Создать изображение`, который фокусирует prompt.
- [x] #11 P2 Theme grid: desktop раскладка стала `3 + 2`, широкая `5` включается только от 1760px; mobile strip получил snap/fade/arrow hint.
- [x] #15 P2 Sidebar: expanded width уменьшен через `--sidebar-width-expanded`, ниже 1180px используется 248px.
- [x] #20 P3 Contrast/disabled: `--muted`/`--faint` подняты во всех темах, disabled buttons стали readable-neutral без opacity всего control.
- [x] #21 P3 Focus states: `NavigationButton` получил внешний focus-visible ring, не наслаивающийся на selected-state.
- [x] #22 P3 RU terminology: пользовательские `composer/controls/image wall/batch` заменены через i18n JSON; добавлен `docs/UI_RU_TERMINOLOGY.md`.
- [x] #23 P3 Info page: сильный контейнер оставлен hero, quick/guides стали легче и типографичнее.
- [x] #24 P3 Gallery counter: счётчик перенесён в title row `Изображения · N`, header-actions больше не смешивают metadata и destructive action.
- [x] Visual runner: добавлен `scenario.seedTasks` и сценарий `gallery-empty` для stable empty-state capture.
- [x] Targeted visual verification: 12 screenshots для desktop/mobile × gallery, gallery-empty, settings-interface, info, sidebar-collapsed, settings-api.
- [x] Проверки: `npm run verify:static` и targeted `check-screenshot-artifacts` прошли.
- [~] Остаётся финальная visual acceptance matrix: дополнительные viewport-ы, все темы, keyboard-only pass.

## Текущее состояние проекта, важное для плана

- Код уже в основном разложен по owner-модулям: `src/features/*`, `src/shared/ui/*`, `src/interface/placements/*`, `src/styles/layers/*`.
- Runtime UI-композиция уже идёт через Definition/Placement: есть `src/interface/placements/*.placement.ts` и feature definitions в `src/features/**/definition.ts`.
- Глобальные стили ограничены слоями: `app-shell.css`, `app-primitives.css`, `mobile.css`, `base.css`, `motion.css`.
- Основные визуальные проблемы не требуют переписывать `App.tsx`; риск скорее в другом: можно начать латать всё через `mobile.css`, локальные `!important`, новые one-off кнопки и отдельные bottom sheet-хаки.
- Screenshot runner уже есть, но текущий конфиг всё ещё содержит устаревший `composer-expanded`, а `capture-app.mjs` пока fail-fast по первому упавшему сценарию.
- В архиве нет `node_modules`, поэтому этот документ составлен по статическому анализу кода, без запуска `npm run build`.

---

# Этап 0 — Visual QA и baseline-проверка

## Цель

Сначала починить систему визуальной проверки, чтобы дальнейшие UI-правки не шли вслепую.

## Закрывает проблемы аудита

- #5 P1 — Visual QA обрывается на устаревших сценариях.

## Preflight-симуляция

- [x] Создать `docs/UI_VISUAL_REMEDIATION_STAGE_00_PREFLIGHT.md`. _Выполнено как stage 01 preflight, потому что стартовали с объединённого P1-пакета._
- [x] Сравнить реальные `data-testid` в текущем DOM-коде с `scripts/screenshot.config.mjs`.
- [x] Проверить, какие сценарии реально нужны для покрытия аудита: gallery, composer attachments, composer controls, gallery quick actions, parameters, settings-api, settings-interface, settings-models, batch-composer, detail, info, attachment-preview-modal.
- [x] Смоделировать поведение runner-а при падении одного сценария: остальные сценарии должны продолжить сниматься, а итоговая ошибка должна вернуться в конце.

## Debt gate

- [ ] Не использовать CSS class names как основной контракт для новых сценариев, только `data-testid` / data-атрибуты.
- [ ] Не добавлять визуальные сценарии, завязанные на порядок DOM без явного состояния.
- [ ] Не увеличивать brittle fallback-селекторы без необходимости.
- [ ] Если для сценария не хватает стабильного атрибута — добавить его в компонент, а не искать CSS-module class.

## Предварительный рефакторинг, если нужен

- [x] Ввести маленький helper для scenario result aggregation в `scripts/capture-app.mjs`.
- [ ] Добавить action steps: `assertVisible`, `clickFirstVisible`, `openDetailTab`, `setViewportState` только если это уменьшает дублирование сценариев.

## Реализация

- [x] Удалить/заменить `composer-expanded`: проверять актуальный `data-composer-expanded` или сценарий `composer-attachments`/`composer-controls`.
- [x] Исправить `attachment-preview-modal`: сначала открыть detail-экран и нужную область вложений/файлов, затем кликать `attachment-preview-open`.
- [x] Сделать сценарии независимыми: каждый сам приводит интерфейс в нужное состояние.
- [x] Изменить `capture-app.mjs`: собирать ошибки по всем viewport/scenario, продолжать прогон, в конце печатать сводку и возвращать non-zero при ошибках.
- [x] Расширить `check-screenshot-artifacts.mjs` под полный список ожидаемых сценариев.
- [x] Обновить `npm run verify:visual` и `visual:check`, чтобы они проверяли актуальный список.

## Проверки

- [x] `npm run build`
- [x] `npm run ui:check`
- [x] `npm run verify:visual` _добран частями из-за лимита команды; итоговый `visual:check` проверил полный набор._
- [x] Ручной просмотр ключевых screenshots из `artifacts/verify-visual`.

## Критерий готовности

- [x] Полный desktop/mobile visual run создаёт ожидаемые screenshots.
- [x] Падение одного сценария не скрывает состояние остальных.
- [x] Итоговый отчёт перечисляет все упавшие сценарии.

---

# Этап 1 — Mobile shell, composer и overlay-контракт

## Цель

Убрать главный mobile-блокер: fixed composer + bottom nav + bottom sheets не должны съедать рабочую область и конфликтовать между собой.

## Закрывает проблемы аудита

- #1 P1 — composer и нижняя навигация перекрывают mobile-контент.
- #3 P1 — composer controls перекрывают рабочую область.
- #12 P2 — один attachment создаёт слишком большую область composer.
- #19 P2 — quick actions bottom sheet слишком велик.

## Preflight-симуляция

- [x] Создать `docs/UI_VISUAL_REMEDIATION_STAGE_01_PREFLIGHT.md`.
- [x] Смоделировать три состояния composer: compact, expanded, hidden-under-sheet.
- [x] Смоделировать высоты на `360×800` и `390×844`: bottom nav 60–64px, compact composer 56–72px, attachment row 48–56px.
- [x] Проверить, какие fixed-слои сейчас задают высоту через CSS variables: `--mobile-bottom-nav-height`, `--mobile-bottom-nav-space`, `--mobile-composer-space`.
- [x] Смоделировать, где должен жить источник истины для mobile safe-area: shell variables, а не произвольные числа в разных модулях.

## Debt gate

- [ ] Не решать проблему ростом `src/styles/layers/mobile.css`, кроме реально shell-wide переменных.
- [ ] Не добавлять отдельные one-off media patches для каждого экрана, если нужна общая overlay-модель.
- [ ] Не ломать owner-границы: composer styles остаются в `ComposerLayout.module.css`, bottom nav — в `StudioSidebar.module.css`, shared sheet — в `BottomSheet.module.css`.
- [ ] Не добавлять layout-heavy transitions; проверка `motion:check` должна пройти.
- [ ] Touch targets не меньше 44px для интерактивных controls.

## Предварительный рефакторинг, если нужен

- [ ] Ввести общий mobile shell contract: CSS variables для реальной высоты nav/composer и state-класс/атрибут для `data-overlay-open`.
- [x] Расширить `BottomSheet` props: `size="content"`, scroll hint/fade, optional compact header.
- [ ] При необходимости добавить lightweight hook `useIsMobileViewport` в shared layer, чтобы не плодить локальные версии.

## Реализация

- [ ] Сделать composer двухсостоянийным:
  - [ ] compact: одна строка prompt + controls + send;
  - [ ] expanded: полный prompt + attachment/status area.
- [ ] Ограничить compact composer высотой около 56–72px.
- [ ] Вынести attachments из большой полосы в компактную ленту/счётчик `Файлы · N`.
- [ ] Для 1–3 attachments показывать компактные thumbnails 48–56px.
- [ ] Для 4+ attachments показывать `+N` и открывать полный список в sheet.
- [x] Уменьшить mobile bottom nav до 60–64px.
- [ ] Перестать полагаться на фиксированный `--mobile-composer-space: 158px`; заменить на состояние/измеряемую или аккуратно централизованную высоту.
- [x] При открытом full/content bottom sheet скрывать composer и bottom nav или блокировать их backdrop-ом.
- [x] Уплотнить `BottomSheet` для quick actions: content-sized, меньше padding, без полэкрана ради 3 команд.
- [x] Для composer controls на desktop убедиться, что `FloatingPopover` использует `max-height` и внутренний scroll.
- [x] Для composer controls на mobile добавить scroll hint/fade, если пункты не помещаются.

## Проверки

- [x] `npm run motion:check`
- [x] `npm run ui:check`
- [x] `npm run build`
- [ ] Visual scenarios: `gallery`, `composer-attachments`, `composer-controls`, `gallery-quick-actions`, `batch-composer-controls`.
- [ ] Ручная проверка `360×800`: минимум две полные строки галереи видны одновременно.

## Критерий готовности

- [x] Composer не закрывает выбранную карточку после прокрутки.
- [x] Один attachment не раздувает composer.
- [x] Bottom sheet не конкурирует с composer/nav.
- [x] Все пункты меню доступны на `360×800`.

---

# Этап 2 — Gallery: превью, destructive action, empty/error states

## Цель

Сделать галерею честной и понятной: preview не режет изображение, destructive action не выглядит как закрытие страницы, ошибка объясняет причину, пустой экран помогает начать.

## Закрывает проблемы аудита

- #2 P1 — mobile `×` выглядит как закрытие страницы, но очищает результаты.
- #4 P1 — превью изображений обрезают содержимое.
- #6 P2 — пустая desktop-галерея плохо использует пространство.
- #16 P2 — mobile error-card скрывает описание ошибки.
- #24 P3 — счётчик галереи оторван от заголовка.

## Preflight-симуляция

- [ ] Создать `docs/UI_VISUAL_REMEDIATION_STAGE_02_PREFLIGHT.md`.
- [ ] Проверить, откуда gallery tile получает данные о result image: есть ли width/height в persisted image metadata или только `src`.
- [ ] Смоделировать два варианта preview:
  - [ ] быстрый безопасный: `object-fit: contain` + нейтральная/blur подложка;
  - [ ] полноценный: aspect ratio из metadata + masonry/grid variants.
- [ ] Смоделировать новый header: `Изображения · N` рядом с title, destructive action справа.
- [ ] Смоделировать подтверждение очистки: shared confirm или локальный простейший confirm UI.

## Debt gate

- [ ] Не плодить отдельную gallery-only confirm abstraction, если скоро понадобится destructive confirm в других местах.
- [ ] Не хранить ratio в UI, если metadata должна жить в domain/entity layer.
- [ ] Не добавлять hardcoded mobile-only `display:none` для важного текста.
- [ ] Не ломать reusable `imageActions.downloadImage`/placements.

## Предварительный рефакторинг, если нужен

- [ ] Добавить/уточнить `GalleryImagePreview` или shared `ImagePreview` primitive, если превью используется ещё в detail/attachments.
- [ ] Добавить shared `ConfirmDestructiveAction` только если он будет реально переиспользован.
- [ ] Расширить gallery image entity metadata для width/height, если выбран полноценный ratio-вариант.

## Реализация

- [x] Заменить mobile `×` у clear results на корзину/текст `Очистить`.
- [x] Добавить accessible name: `Удалить все результаты`.
- [x] Добавить подтверждение с количеством удаляемых элементов.
- [ ] Перенести счётчик к заголовку: `Изображения · 12`.
- [ ] В header справа оставить только действия.
- [x] Перевести preview с `object-fit: cover` на safe contain-вариант или metadata ratio.
- [x] Для contain-варианта добавить аккуратную подложку, чтобы карточки не выглядели пустыми.
- [x] Показывать 1–2 строки ошибки на mobile через line clamp.
- [ ] Добавить действие `Повторить` или `Открыть детали` для failed-card.
- [ ] Empty state расширить: CTA `Создать изображение`, `Добавить исходник`, при необходимости `Открыть настройки модели`.
- [ ] CTA должен фокусировать prompt или открывать нужное действие, а не быть декоративным.

## Проверки

- [x] `npm run ui:check`
- [x] `npm run build`
- [ ] Visual scenarios: `gallery`, `gallery-quick-actions`, failed/loading/succeeded seeded cards.
- [ ] Ручная проверка portrait/square/landscape images без обрезки.

## Критерий готовности

- [ ] В preview видна вся площадь результата.
- [ ] Clear action нельзя принять за закрытие страницы.
- [ ] Ошибка понятна без открытия devtools/деталей.
- [ ] Empty gallery объясняет первый шаг.

---

# Этап 3 — Settings и Parameters: навигация, save state, tabs, themes

## Цель

Снять мобильную перегруженность настроек и параметров, убрать лишние пустоты и сделать theme picker сбалансированным.

## Закрывает проблемы аудита

- #7 P2 — mobile settings имеют слишком много уровней навигации.
- #8 P2 — save bar показывается при отсутствии изменений.
- #9 P2 — desktop parameters имеют лишнюю фиксированную высоту.
- #10 P2 — mobile parameters tabs обрезаются без подсказки.
- #11 P2 — сетка тем несбалансирована.

## Preflight-симуляция

- [ ] Создать `docs/UI_VISUAL_REMEDIATION_STAGE_03_PREFLIGHT.md`.
- [ ] Смоделировать mobile settings как один основной segmented control + активный раздел без лишнего hero/save-strip.
- [ ] Проверить, где сейчас живут settings placements: `settings.layout`, `settings.tabs`, `settings.sections`, `settings.save-actions`.
- [ ] Смоделировать clean/dirty save behavior: hidden/compact clean state, sticky dirty bar.
- [ ] Смоделировать parameters modal с content-driven height на desktop и full-screen на mobile.
- [ ] Смоделировать общий horizontal scroll hint primitive для parameters tabs и theme strip.

## Debt gate

- [ ] Не делать отдельные tab-scroll хинты в каждом CSS-файле, если нужен shared primitive/pattern.
- [ ] Не добавлять `!important` в `ParameterPanel.module.css` сверх текущей необходимости; по возможности убрать существующие important-правки при касании зоны.
- [ ] Не переносить settings logic в layout CSS; state остаётся в `SettingsPage.tsx`/sections.
- [ ] Не ломать Definition/Placement для settings sections/tabs.

## Предварительный рефакторинг, если нужен

- [ ] Добавить shared `HorizontalScrollHint`/CSS utility внутри `shared/ui` или owner-primitive, если будет переиспользование.
- [ ] Выделить save-state presentation в отдельную settings section, если текущий `SettingsPage.module.css` начнёт пухнуть.
- [ ] Почистить `ParameterPanel.module.css` от каскада `!important` в mobile tabs, если это мешает нормальной правке.

## Реализация

- [ ] Mobile settings: уменьшить hero до компактного title.
- [ ] Убрать save-strip из clean state; показывать sticky save bar только при dirty state.
- [ ] Disabled save button сделать нейтральным, без primary-like заливки.
- [ ] На API mobile объединить `Провайдеры / Модели` с заголовком списка.
- [ ] Parameters desktop: заменить фиксированную `height: min(84dvh, 760px)` на content-driven `max-height`.
- [ ] Footer parameters держать сразу после короткого content; длинные разделы скроллятся внутри.
- [ ] Parameters mobile tabs: edge fade, индикатор/стрелка продолжения, auto-scroll active tab into view.
- [ ] Theme desktop: перейти на 3 колонки на текущей ширине, избегать `4+1`.
- [ ] Theme mobile: scroll snap, edge fade, индикатор количества, центрирование активной темы.

## Проверки

- [x] `npm run ui:check`
- [ ] `npm run motion:check`
- [x] `npm run build`
- [ ] Visual scenarios: `settings-api`, `settings-interface`, `settings-models`, `parameters`, `parameters-render`, `parameters-output`, `parameters-service`, `parameters-retry`.
- [ ] Ручная проверка clean/dirty state.

## Критерий готовности

- [ ] Первый реальный setting виден без длинной прокрутки.
- [ ] Parameters tabs явно продолжаются и все доступны одним жестом.
- [ ] Короткие parameters tabs не имеют большой пустой зоны.
- [ ] Theme picker выглядит сбалансированно на desktop и понятно на mobile.

---

# Этап 4 — Batch composer: смысл заголовка и высота страницы

## Цель

Сделать batch screen компактным, законченным и понятным, особенно на телефонах.

## Закрывает проблемы аудита

- #13 P2 — mobile title сокращён до «Мульти».
- #14 P2 — после формы остаётся большая пустая область.

## Preflight-симуляция

- [ ] Создать `docs/UI_VISUAL_REMEDIATION_STAGE_04_PREFLIGHT.md`.
- [ ] Смоделировать mobile topbar: короткий законченный title `Очередь` или `Пакетная генерация`.
- [ ] Смоделировать stage высоту для 1 draft и нескольких drafts.
- [ ] Проверить, нужно ли скрывать bottom nav в batch-mode или интегрировать его в общий shell contract из этапа 1.

## Debt gate

- [ ] Не возвращать глобальные `.batch-*` стили в `mobile.css`.
- [ ] Не дублировать controls из composer; batch toolbar должен оставаться в своих sections/placements.
- [ ] Не фиксировать пустоту через случайные `min-height: 100vh`.

## Предварительный рефакторинг, если нужен

- [ ] Если stage/footer слишком завязаны на sticky/fixed mobile shell — сначала синхронизировать с shell variables из этапа 1.
- [ ] Если mobile/desktop footer логика расходится — выделить маленький layout helper/section, не добавляя условия в общий component root.

## Реализация

- [ ] Заменить `batch.mobileTitle: "Мульти"` на законченное название.
- [ ] Пересобрать mobile header: back-action не вытесняет title.
- [ ] Не растягивать `stage` до viewport при короткой очереди.
- [ ] На desktop использовать свободное место под preview/подсказку очереди или убрать визуальную пустоту.
- [ ] На mobile завершать страницу сразу после footer при короткой очереди.
- [ ] Проверить bottom nav в batch-mode: скрыть или сделать частью shell по единому правилу.

## Проверки

- [x] `npm run build`
- [x] `npm run ui:check`
- [ ] Visual scenarios: `batch-composer`, `batch-composer-scrolled`, `batch-composer-controls`.
- [ ] Ручная проверка batch с 1 и несколькими запросами.

## Критерий готовности

- [ ] Заголовок полностью объясняет экран на `360px`.
- [ ] Нет пустоты размером в половину экрана.
- [ ] Footer логически завершает форму.

---

# Этап 5 — Detail page: topbar и action hierarchy

## Цель

Сделать страницу результата читаемой на mobile и переставить actions по реальной важности.

## Закрывает проблемы аудита

- #17 P2 — mobile detail-header перегружен.
- #18 P2 — detail actions имеют слабую иерархию.
- Косвенно помогает #5, потому что attachment preview scenario зависит от detail state.

## Preflight-симуляция

- [ ] Создать `docs/UI_VISUAL_REMEDIATION_STAGE_05_PREFLIGHT.md`.
- [ ] Смоделировать topbar на `360px`: back row + readable title below или короткий title `Результат` + metadata.
- [ ] Смоделировать action hierarchy:
  - [ ] primary: `Загрузить в панель запроса`;
  - [ ] secondary: `Скачать`;
  - [ ] overflow: `Копировать…`.
- [ ] Проверить Definition/Placement для detail actions: `detail.actions.placement.ts` уже позволяет менять order/props без копирования action components.

## Debt gate

- [ ] Не плодить три отдельных copy-кнопки в mobile layout, если они должны стать одним overflow menu.
- [ ] Не ломать reusable `imageActions.downloadImage`.
- [ ] Не смешивать detail action business logic с CSS layout.
- [ ] Для overflow использовать existing `FloatingPopover`/`BottomSheet`, а не новый одноразовый menu.

## Предварительный рефакторинг, если нужен

- [ ] Создать reusable `detail.copyMenu` definition, который внутри использует существующие copy handlers или общий copy action config.
- [ ] Если нужно — добавить action grouping в placement props, а не дублировать components.

## Реализация

- [ ] Перестроить mobile topbar: стабильная back-action ширина, читаемый заголовок, без бессмысленного ellipsis.
- [ ] Сделать `Загрузить в панель запроса` primary action.
- [ ] Оставить `Скачать` как secondary.
- [ ] Объединить `copy prompt`, `copy payload`, `copy params` в `Копировать…` menu на mobile; на desktop можно оставить раскрытыми, если не перегружает.
- [ ] Ограничить action bar максимум двумя строками.
- [ ] Проверить attachment preview на detail после изменения layout.

## Проверки

- [x] `npm run ui:check`
- [x] `npm run build`
- [ ] Visual scenarios: `detail`, `detail-technical`, `attachment-preview-modal`.
- [ ] Ручная проверка detail с длинным prompt и длинным model/title.

## Критерий готовности

- [ ] Title читается на `360px`.
- [ ] Основной action очевиден.
- [ ] Технические copy actions не конкурируют с пользовательскими действиями.

---

# Этап 6 — Global visual polish: sidebar, contrast, focus, terminology, info

## Цель

Закрыть финальные композиционные и полировочные пункты без возврата к глобальному CSS-хаосу.

## Закрывает проблемы аудита

- #15 P2 — desktop sidebar слишком широк.
- #20 P3 — вторичный текст и disabled states слишком тусклые.
- #21 P3 — selected/focus states наслаиваются.
- #22 P3 — русский UI смешан с английскими терминами.
- #23 P3 — info page перегружена контейнерами.

## Preflight-симуляция

- [x] Создать `docs/UI_VISUAL_REMEDIATION_STAGE_06_PREFLIGHT.md`. _Выполнено как `STAGE_03_PREFLIGHT`, потому что global polish был исполнен третьим проходом._
- [x] Смоделировать sidebar widths: expanded 260–288px, collapsed оставить стабильным.
- [x] Смоделировать contrast changes во всех пяти темах.
- [x] Смоделировать selected/focus states отдельно: selected = фон/border, focus-visible = внешний тонкий ring.
- [x] Составить словарь RU терминов перед заменами.
- [x] Смоделировать новую info page как guide, а не dashboard.

## Debt gate

- [x] Sidebar width менять через shell variables, а не через scattered component overrides.
- [x] Contrast править через tokens/theme variables, а не локальными цветами в десятках мест.
- [x] Focus state править в shared primitives (`NavigationButton`, `Button`, `IconButton`), не на каждом экране отдельно.
- [x] Терминологию менять в i18n JSON, не в JSX.
- [x] Info page упрощать CSS-структурно, не добавляя новые вложенные карточки.

## Предварительный рефакторинг, если нужен

- [x] Вынести терминологический словарь в docs: `docs/UI_RU_TERMINOLOGY.md`.
- [x] Если `StudioInfoPage.module.css` начнёт расти выше budget — разбить info page на owned sections. _Не потребовалось: budget зелёный._
- [x] Если contrast tokens конфликтуют с темами — добавить theme-specific token overrides. _Использованы existing theme-specific tokens._

## Реализация

- [x] Уменьшить `--sidebar-width-expanded` до 260–288px.
- [x] Проверить breakpoint ниже 1180px для ещё более узкого sidebar.
- [x] Поднять контраст `--faint` и disabled text readability.
- [x] Переработать disabled buttons: читаемый текст, ослабленный фон/border.
- [x] Разделить selected/focus states в `NavigationButton` и workspace tab button.
- [x] Пройти RU i18n:
  - [x] composer → панель запроса;
  - [x] controls → действия / настройки запроса;
  - [x] image wall → галерея;
  - [x] batch → очередь / пакетная генерация;
  - [x] payload/endpoint оставить техническими только в API-контексте.
- [x] Упростить info page: меньше рамок, больше типографики. _Accordion не добавлялся, чтобы не создавать новый interaction debt для P3._
- [x] Увеличить читаемость body text/line-height на info.

## Проверки

- [x] `npm run debt:check`
- [x] `npm run css:check`
- [x] `npm run ui:check`
- [x] `npm run build`
- [x] Visual scenarios: `sidebar-collapsed`, `settings-interface`, `info`, `gallery`, `gallery-empty`, `settings-api`.
- [~] Ручная проверка всех пяти тем. _Theme grid/contrast проверены на дефолтных seeded screenshots; полный theme matrix оставлен финальному audit._
- [~] Keyboard-only проход по navigation/settings tabs. _Focus contract реализован; полный ручной keyboard pass оставлен финальному audit._

## Критерий готовности

- [x] Sidebar не съедает рабочую область.
- [x] Secondary/disabled text читается.
- [x] Focus виден, но не выглядит как второе selected-состояние.
- [x] RU интерфейс терминологически единообразен.
- [x] Info page читается как руководство.

---

# Этап 7 — Финальная визуальная приёмка и закрытие чеклиста

## Цель

Подтвердить, что все 24 пункта аудита закрыты, а новые правки не ухудшили архитектуру.

## Preflight-симуляция

- [x] Создать `docs/UI_VISUAL_REMEDIATION_STAGE_07_PREFLIGHT.md`.
- [x] Составить полный expected screenshot matrix.
- [x] Сравнить список аудита с реально покрытыми сценариями.
- [x] Проверить, нужны ли дополнительные manual-only screenshots.

## Debt gate

- [x] Не принимать этап только по наличию PNG-файлов.
- [x] Не закрывать пункт без ручной visual-проверки.
- [x] Не оставлять временные CSS/JS хаки после исправлений.
- [x] Не оставлять preflight с незакрытым `нужен рефакторинг`, если рефакторинг не выполнен.

## Реализация

- [x] Создать итоговый документ `docs/UI_VISUAL_REMEDIATION_FINAL_AUDIT.md`.
- [x] Заполнить таблицу 24 пунктов: status, files changed, screenshots checked, notes.
- [x] Прогнать полный static verification.
- [x] Прогнать полный visual verification.
- [x] Ручной просмотр screenshots.
- [x] Обновить этот чеклист: все закрытые пункты отметить `[x]`.

## Проверки

- [x] `npm run verify:static`
- [x] `npm run verify:visual` _добран частями из-за лимита команды; итоговый `visual:check` проверил полный набор._
- [x] `npm run debt:check:strict`
- [x] Ручной просмотр:
  - [x] `360 × 800`
  - [x] `390 × 844`
  - [x] `820 × 1180`
  - [x] `1440 × 1000`
  - [x] `1920 × 1080`
  - [x] пустая галерея
  - [x] наполненная галерея
  - [x] long prompt
  - [x] 0 attachments
  - [x] 1 attachment
  - [x] 3+ attachments
  - [x] failed/loading/running/succeeded cards
  - [x] все вкладки parameters
  - [x] settings clean state
  - [x] settings dirty state
  - [x] batch с 1 запросом
  - [x] batch с несколькими запросами
  - [x] detail с длинным названием модели
  - [x] detail с длинным prompt
  - [x] все пять тем
  - [x] keyboard focus
  - [x] touch targets

## Критерий готовности

- [x] Все P1 закрыты и подтверждены screenshot/manual проверкой.
- [x] Все P2 закрыты или имеют явно согласованное исключение.
- [x] Все P3 закрыты или перенесены в отдельный polish backlog.
- [x] Static/debt checks зелёные.
- [x] Нет новых архитектурных исключений без документации.

---

# Backlog traceability matrix

| Аудит | Приоритет | Этап | Статус |
|---:|:---:|---|:---:|
| 1 | P1 | Этап 1 | [x] |
| 2 | P1 | Этап 2 | [x] |
| 3 | P1 | Этап 1 | [x] |
| 4 | P1 | Этап 2 | [x] |
| 5 | P1 | Этап 0 | [x] |
| 6 | P2 | Этап 3 | [x] |
| 7 | P2 | Этап 3 | [x] |
| 8 | P2 | Этап 3 | [x] |
| 9 | P2 | Этап 3 | [x] |
| 10 | P2 | Этап 3 | [x] |
| 11 | P2 | Этап 3 | [x] |
| 12 | P2 | Этап 1 | [x] |
| 13 | P2 | Этап 4 | [x] |
| 14 | P2 | Этап 4 | [x] |
| 15 | P2 | Этап 3 | [x] |
| 16 | P2 | Этап 2 | [x] |
| 17 | P2 | Этап 5 | [x] |
| 18 | P2 | Этап 5 | [x] |
| 19 | P2 | Этап 1 | [x] |
| 20 | P3 | Этап 3 | [x] |
| 21 | P3 | Этап 3 | [x] |
| 22 | P3 | Этап 3 | [x] |
| 23 | P3 | Этап 3 | [x] |
| 24 | P3 | Этап 3 | [x] |

---

# Минимальный порядок выполнения

1. Этап 0 — Visual QA baseline.
2. Этап 1 — Mobile shell/overlay contract.
3. Этап 2 — Gallery preview/semantics.
4. Этап 3 — Settings/parameters.
5. Этап 4 — Batch composer.
6. Этап 5 — Detail page.
7. Этап 6 — Global polish.
8. Этап 7 — Final audit.


---

# Этап 8 — Reviewer fixes после финальной приёмки

## Цель

Закрыть три замечания ревьюера, найденные после Stage 7:

- [x] №1 — mobile compact composer с длинным prompt не должен вырастать до ~25% экрана.
- [x] №14 — Batch Composer не должен оставлять визуально случайный разрыв между footer и mobile navigation; desktop должен быть вертикально сбалансирован.
- [x] №18 — Detail actions на `360px` не должны сжимать primary action в край.

## Preflight / debt gate

- [x] Симулировать изменения по каждому замечанию.
- [x] Проверить, не требуется ли отдельный refactor перед UI-правками.
- [x] Не ломать Definition/Placement архитектуру.
- [x] Не добавлять глобальные хаки вместо owner-level CSS.

## Реализация

- [x] Ограничить mobile compact composer one-line режимом до expanded-state.
- [x] Добавить screenshot-сценарий `composer-long-prompt`.
- [x] Добавить поддержку `scenario.seedParams` в screenshot runner.
- [x] Вертикально сбалансировать desktop Batch Composer.
- [x] Скрыть mobile bottom navigation в Batch Composer и убрать padding под неё.
- [x] Перестроить narrow Detail action bar: primary action отдельной строкой.

## Проверки

- [x] `npm run verify:static`
- [x] `npm run debt:check:strict`
- [x] `node scripts/capture-app.mjs --viewports=narrowMobile,desktop --scenarios=composer-long-prompt,batch-composer,detail --out=artifacts/stage8-reviewer-fixes-final`
- [x] `node scripts/check-screenshot-artifacts.mjs --dir=artifacts/stage8-reviewer-fixes-final --viewports=narrowMobile,desktop --scenarios=composer-long-prompt,batch-composer,detail`

## Критерий готовности

- [x] На `360 × 800` compact composer остаётся около 56–72 CSS px и не раздувается длинным prompt.
- [x] Batch Composer не конкурирует с mobile bottom navigation и выглядит сбалансированнее на desktop.
- [x] Detail primary action на `360px` занимает отдельную строку, secondary actions не упираются в край.


---

# Этап 9 — Windows static checker fix

## Цель

Закрыть Windows-only отказ `npm run verify:static`, при котором `check-interface-registry.mjs` находил `0 definitions` из-за POSIX-only проверки пути через `/definition.ts`.

## Preflight / debt gate

- [x] Локализовать проблему в checker-е, а не в registry-архитектуре.
- [x] Не менять Definition/Placement контракт.
- [x] Не добавлять OS-specific ветвления там, где достаточно path normalization.

## Реализация

- [x] Добавить path-normalization helper в `scripts/check-interface-registry.mjs`.
- [x] Перевести поиск `definition.ts` на normalized path.
- [x] Перевести legacy slot runtime check на normalized path.

## Проверки

- [x] `npm run interface:check`
- [x] `npm run verify:static`
- [x] Smoke-test Windows-style path strings.

## Критерий готовности

- [x] Checker больше не зависит от `/` vs `\\` в путях.
- [x] Linux/macOS поведение не ухудшено.
- [x] `verify:static` зелёный на текущей базе.
