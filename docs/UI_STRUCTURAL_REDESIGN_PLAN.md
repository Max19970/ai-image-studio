# Image Studio — план структурного UI/UX-редизайна

Версия: 2026-06-18  
Статус: рабочий план; реализация не начата  
Цель: сохранить визуальную ДНК Image Studio — тёмное стекло, мягкие скругления, blur, аккуратные motion-переходы — но перестроить интерфейс так, чтобы приложение ощущалось как взрослый production-инструмент, а не как набор одинаковых AI-dashboard карточек.

---

## Легенда статусов

- `[ ]` не начато
- `[~]` в процессе
- `[x]` завершено
- `[!]` требует решения/ручной проверки

---

## Контекст и исходный диагноз

Перед планированием был выполнен первичный визуальный аудит текущего состояния приложения через screenshot runner.

Проверенные сценарии:

- `gallery`;
- `settings-api`;
- `detail`;
- `batch-composer`;
- `info`;
- collapsed sidebar;
- parameter modal;
- attachment preview modal;
- composer popovers;
- language/model/settings popovers;
- desktop и mobile viewports.

Сохранённые контакт-листы аудита:

- `artifacts/redesign-desktop-contact.jpg`;
- `artifacts/redesign-mobile-contact.jpg`;
- `artifacts/redesign-extra-contact.jpg`;
- `artifacts/redesign-popovers-contact.jpg`.

Главный вывод: проблема не в базовом визуальном стиле, а в информационной архитектуре и одинаковом визуальном весе почти всех элементов.

Текущий UI часто показывает слишком много вторичной информации сразу:

- карточки внутри карточек;
- декоративные плашки вокруг почти каждого фрагмента;
- технические блоки на одном уровне с основным пользовательским содержимым;
- многоуровневые раскрытия вместо ясных экранов, drawers, inspectors и sheets;
- mobile layout часто является сжатой desktop-колонкой, а не самостоятельной мобильной моделью взаимодействия.

---

## Главная продуктовая цель

Перевести приложение от модели:

```txt
карточки + плашки + вложенные details + dashboard-вид
```

к модели:

```txt
главная рабочая поверхность + контекстные действия + inspector/drawer/sheet + mobile-first flows
```

Иными словами:

- Gallery должна быть стеной изображений, а не сеткой отчётных карточек.
- Composer должен быть командной поверхностью, а не мини-дашбордом.
- Detail page должна быть сценой изображения с инспектором, а не техническим отчётом.
- Settings должны стать рабочим редактором объектов, а не коллекцией вложенных карточек.
- Batch composer должен стать очередью/timeline, а не списком тяжёлых request cards.
- Popovers должны быть компактными инструментами выбора/действия, а не маленькими модалками.
- Mobile должен получить отдельные layout и interaction patterns, а не просто вертикальную версию desktop.

---

## Неприкосновенные архитектурные правила

Этот редизайн не должен ломать уже вычищенную архитектуру проекта.

- Новый UI элемент добавляется как definition, а не как случайный импорт в конкретную страницу.
- Новое место отображения существующего элемента настраивается через placement/config, а не копированием компонента.
- Feature-specific UI остаётся внутри своей feature-зоны.
- Reusable primitives живут в `src/shared/ui` или новом целевом слое дизайн-системы.
- Глобальные CSS-слои не должны снова превращаться в свалку.
- Стили кладём рядом с владельцем компонента, кроме настоящих app-wide tokens/layers.
- Поведение генерации, storage, provider adapters и batch runner не меняем без отдельной причины.
- Каждый этап заканчивается `npm run build` и визуальной проверкой затронутых сценариев.

---

## Анти-slop правила интерфейса

Эти правила действуют на все этапы.

### 1. У каждой страницы должна быть одна главная поверхность

- Gallery: изображения.
- Detail: выбранное изображение.
- Composer: ввод и запуск запроса.
- Settings: выбранная сущность/настройка.
- Batch: очередь запросов.
- Info: справочный материал, но без перегруза декоративными блоками.

Если элемент не обслуживает главную поверхность, он должен быть вторичным: overlay, inspector, drawer, popover, bottom sheet, command menu или collapsed control.

### 2. Карточки нельзя использовать как универсальный ответ

Карточка допустима, если она действительно представляет самостоятельный объект:

- provider;
- model;
- generation task;
- batch request;
- theme preset.

Карточка нежелательна, если она просто оборачивает:

- подпись;
- одну строку метаданных;
- обычный input;
- мелкую подсказку;
- технический статус;
- раздел, который можно показать как list row, inspector group или toolbar item.

### 3. Не больше двух уровней disclosure

Если появляется третий уровень раскрытия, значит нужен другой паттерн:

- отдельный tab;
- side inspector;
- full-screen mobile screen;
- drawer;
- bottom sheet;
- command palette;
- dedicated editor.

### 4. Техническое показывать по требованию

Промпт, изображение, режим, модель и результат — основные данные.  
Сырые параметры, request/response следы, storage/debug/status details — developer-level информация.

Она должна быть доступна, но не должна занимать главный визуальный слой.

### 5. Mobile не является сжатым desktop

Mobile должен использовать:

- bottom navigation вместо постоянной левой панели;
- bottom sheets вместо боковых инспекторов;
- full-screen editors вместо узких модалок;
- action sheets вместо плотных toolbar-групп;
- короткие списки и progressive navigation вместо трёхколоночных layout.

---

## Целевые UI primitives / interaction patterns

Перед большими page-level изменениями нужно привести к общему виду набор primitives, которыми будет собираться новый интерфейс.

Целевые building blocks:

- `AppShell` — общий shell с desktop/mobile режимами.
- `CommandBar` — компактная верхняя/контекстная панель действий.
- `ComposerDock` — нижняя командная поверхность composer.
- `BottomSheet` — основной mobile-паттерн для composer, filters, actions, params.
- `SideInspector` — desktop-паттерн для деталей выбранного объекта.
- `EntityList` — компактный список сущностей без лишних карточек.
- `ObjectEditor` — форма редактирования выбранной сущности.
- `ImageWall` / `ImageTile` — галерея, где изображение является главной поверхностью.
- `ActionOverlay` — hover/tap overlay для действий над изображением.
- `TimelineQueue` — компактное отображение batch-запросов.
- `CommandPopover` — popover для выбора mode/model/language/action.
- `DeveloperDrawer` — скрытый слой технических деталей.
- `SegmentedTabs` — неглубокая навигация внутри одного контекста.
- `FilterTokens` — компактные активные фильтры вместо отдельной панели-плашки.

---

# Этап 0. Базовая фиксация и визуальная карта

**Статус:** `[x]` первичный аудит выполнен; `[ ]` документировать финальную карту после утверждения плана.

## Зачем

Перед структурным редизайном нужна точка отсчёта: какие экраны есть, как они выглядят, какие модалки/поповеры реально существуют, где именно интерфейс перегружен. Без этого есть риск исправлять только самый заметный экран и оставить slop в соседних местах.

## Что делаем

- Фиксируем список всех затрагиваемых страниц и состояний.
- Сохраняем visual baseline contact sheets.
- Отмечаем места с перегрузом карточками, details-блоками, таблицами, техническими плашками.
- Определяем, какие страницы нужно редизайнить полностью, а какие достаточно полировать.

## Чеклист

- [x] Собрать проект через `npm run build`.
- [x] Снять desktop screenshots для gallery/settings/detail/batch/info.
- [x] Снять mobile screenshots для gallery/settings/detail/batch/info.
- [x] Проверить основные popovers.
- [x] Проверить parameter modal.
- [x] Проверить attachment preview modal.
- [x] Проверить collapsed sidebar.
- [ ] Добавить в этот документ финальный список всех UI-состояний, которые должны проходить visual QA после каждого этапа.
- [ ] Зафиксировать список компонентов, которые нужно заменить/упростить, а не просто перекрасить.

## Definition of Done

- Есть visual baseline.
- Понятно, какие экраны входят в редизайн.
- Есть чеклист visual QA для дальнейших этапов.

---

# Этап 1. UI principles, density и surface system

**Статус:** `[ ]` не начато

## Зачем

Сейчас приложение визуально единое, но не имеет жёсткой системы уровней поверхности. Поэтому почти всё превращается в стеклянную карточку. Этот этап должен создать правила, по которым дальше можно будет редизайнить страницы без случайного роста новых плашек.

## Что делаем

- Вводим явные уровни поверхностей:
  - `app background`;
  - `workspace surface`;
  - `floating surface`;
  - `inspector surface`;
  - `danger/error surface`;
  - `developer/debug surface`.
- Разделяем плотность UI:
  - `comfortable` для основных экранов;
  - `compact` для inspectors/entity lists;
  - `touch` для mobile.
- Упрощаем визуальные правила:
  - меньше borders;
  - меньше декоративных blur-плашек;
  - больше whitespace и иерархии;
  - glass используется на shell/floating/focus layers, а не на каждом micro-block.
- Обновляем shared primitives, не трогая пока layout страниц глубоко.

## Затрагиваемые зоны

- `src/styles/layers/*`;
- `src/shared/ui/Card`;
- `src/shared/ui/Panel`;
- `src/shared/ui/Button`;
- `src/shared/ui/IconButton`;
- `src/shared/ui/FloatingPopover`;
- `src/shared/ui/PopoverSelect`;
- feature CSS modules, где используются старые surface/card паттерны.

## Чеклист

- [ ] Описать surface уровни в CSS variables/tokens.
- [ ] Упростить `Card` так, чтобы он не провоцировал карточку для каждого блока.
- [ ] Добавить или выделить primitive для `SideInspector`.
- [ ] Добавить или выделить primitive для `BottomSheet`.
- [ ] Добавить primitive для компактных `EntityList` rows.
- [ ] Добавить primitive для `CommandBar`/toolbar-like действий.
- [ ] Пересмотреть typography scale: заголовки, подписи, metadata, technical text.
- [ ] Ввести touch-friendly размеры для mobile controls.
- [ ] Проверить, что новые primitives не ломают текущие экраны до page-level редизайна.
- [x] `npm run build` зелёный.

## Definition of Done

- Есть базовый UI vocabulary для дальнейшего редизайна.
- Старые карточки не исчезли насильно, но появился правильный набор альтернатив.
- Новые этапы могут использовать inspector/sheet/list/command patterns без ad-hoc реализации.

## Что не делаем на этом этапе

- Не переделываем всю Gallery.
- Не переделываем всю Settings page.
- Не меняем бизнес-логику генерации.

---

# Этап 2. App shell и навигационная модель desktop/mobile

**Статус:** `[ ]` не начато

## Зачем

Сейчас desktop и mobile слишком близки по структуре. Нужно определить взрослую shell-модель: desktop использует rail + workspace + inspector/dock, mobile использует content-first layout + bottom navigation + sheets.

## Целевая модель desktop

```txt
┌ rail ┐ ┌──────────── workspace ────────────┐
│      │ │ top/context command bar            │
│ nav  │ │ main page surface                   │
│      │ │ optional side inspector             │
└──────┘ └──────── composer dock ─────────────┘
```

## Целевая модель mobile

```txt
┌────────────────────┐
│ main content        │
│ content-first page  │
│                    │
├ bottom nav/action ─┤
└ sheets/editors ────┘
```

## Что делаем

- Разделяем desktop и mobile shell patterns.
- Проверяем, что sidebar на desktop ведёт себя как постоянный rail, а не как mobile drawer.
- На mobile вводим bottom navigation / compact nav entry points.
- Composer на mobile готовим к bottom sheet-поведению.
- Убираем layout-зависимость, при которой страницы становятся длинной версией desktop.

## Затрагиваемые зоны

- `src/app/App.tsx`;
- `src/features/workspace/StudioSidebar.tsx`;
- `src/features/workspace/StudioSidebar.module.css`;
- `src/interface/placements/workspace.layout.placement.ts`;
- `src/interface/placements/sidebar.*.placement.ts`;
- `src/styles/layers/app-shell.css`;
- `src/styles/layers/mobile.css`.

## Чеклист

- [ ] Описать desktop shell layout в коде и CSS.
- [ ] Описать mobile shell layout отдельно, без копирования desktop rail.
- [ ] Проверить collapsed sidebar на desktop.
- [ ] Убедиться, что mobile страницы скроллятся независимо и не блокируются shell-слоями.
- [ ] Подготовить места для bottom sheets.
- [ ] Убедиться, что composer dock не перекрывает важный контент.
- [ ] Проверить keyboard/focus порядок навигации.
- [ ] Снять screenshots: desktop/mobile gallery, settings, detail, batch.
- [ ] `npm run build` зелёный.

## Definition of Done

- Desktop и mobile имеют разные shell-паттерны.
- Navigation больше не выглядит как сжатый desktop на телефоне.
- Страницы могут дальше редизайниться независимо под desktop и mobile.

---

# Этап 3. Gallery → Image Wall + contextual inspector

**Статус:** `[ ]` не начато

## Зачем

Gallery — главный экран приложения. Сейчас она слишком похожа на сетку карточек с отчётной информацией. Нужно сделать результаты генерации главным визуальным объектом, а служебные данные показывать контекстно.

## Что делаем

- Превращаем gallery grid в `ImageWall`.
- Заменяем тяжёлые cards на `ImageTile`.
- Оставляем на tile только:
  - изображение;
  - статус pending/error, если он есть;
  - маленький badge batch/variant, если нужен;
  - hover/tap overlay с действиями.
- Prompt, params, timestamps, provider/model и technical metadata переносим в side inspector / detail view.
- Фильтры превращаем в compact command/filter bar.
- Активные фильтры показываем как tokens.
- Для mobile делаем image-first grid и filter bottom sheet.

## Затрагиваемые зоны

- `src/features/gallery/ResultsGallery.tsx`;
- `src/features/gallery/ResultsGallery.module.css`;
- `src/features/gallery/galleryUi.tsx`;
- `src/features/gallery/model/galleryArchive.ts`;
- `src/interface/placements/gallery.*.placement.ts`;
- gallery-related commands in `src/app/commands/*Gallery*`.

## Чеклист

- [ ] Спроектировать `ImageWall` layout для desktop.
- [ ] Спроектировать `ImageWall` layout для mobile.
- [ ] Создать/выделить `ImageTile` без тяжёлой карточной обвязки.
- [ ] Перенести primary actions в overlay.
- [ ] Убедиться, что delete/cancel unfinished task остаётся доступным.
- [ ] Вынести metadata в inspector/detail entry point.
- [ ] Упростить empty state без лишних декоративных плашек.
- [ ] Переделать filters/search/sort в compact command/filter area.
- [ ] Сделать mobile filter bottom sheet.
- [ ] Проверить pending generation animation/status visibility.
- [ ] Проверить batch/multi-result carousel или variant switching после упрощения карточек.
- [ ] Проверить lazy loading/full asset hydration.
- [ ] Снять screenshots: gallery desktop, mobile, pending, empty, filtered, collapsed sidebar.
- [ ] `npm run build` зелёный.

## Definition of Done

- Gallery воспринимается как галерея изображений, а не как dashboard.
- Метаданные доступны, но не забивают основной экран.
- Mobile gallery удобна как отдельный image browsing flow.
- Все прежние действия над генерациями доступны.

## Что не делаем на этом этапе

- Не переделываем detail page полностью.
- Не меняем storage model.
- Не ломаем batch task lifecycle.

---

# Этап 4. Composer → command dock + attachment tray

**Статус:** `[ ]` не начато

## Зачем

Composer — второй главный рабочий элемент после галереи. Он должен ощущаться как быстрый command surface: ввёл промпт, выбрал режим/модель, приложил изображения, запустил. Сейчас он местами выглядит как отдельная карточная панель с лишними вложенными блоками.

## Что делаем

- Вводим два состояния composer:
  - collapsed/compact: prompt bar + generate + ключевые controls;
  - expanded: параметры, attachments, advanced controls.
- Вложения показываем как горизонтальный tray, а не как тяжёлую секцию.
- Mode/model/params/tools переводим в компактные controls/popovers/sheets.
- Clear prompt делаем встроенным действием поля, без отдельной кнопочной плашки.
- Для mobile composer становится bottom sheet:
  - compact trigger;
  - half sheet для быстрого prompt;
  - full sheet для params/attachments.

## Затрагиваемые зоны

- `src/features/composer/ImageComposer.tsx`;
- `src/features/composer/ComposerLayout.module.css`;
- `src/features/composer/ui/ComposerPopover.module.css`;
- `src/features/composer/ui/ActionIconButton.*`;
- `src/shared/ui/AttachmentImageStrip/*`;
- `src/interface/placements/composer.*.placement.ts`;
- `src/app/commands/createComposerCommands.ts`;
- `src/app/commands/createParameterCommands.ts`.

## Чеклист

- [ ] Разделить composer на compact и expanded states.
- [ ] Пересобрать prompt input как главный элемент composer.
- [ ] Убрать лишние декоративные containers вокруг secondary controls.
- [ ] Перевести attachments в tray.
- [ ] Проверить target/reference/mask различимость.
- [ ] Проверить file picker flows.
- [ ] Проверить remove attachment actions.
- [ ] Обновить popovers mode/model/tools под command style.
- [ ] Реализовать mobile bottom sheet поведение.
- [ ] Убедиться, что composer не ломает scroll на длинных страницах.
- [ ] Проверить single generation и edit generation UI states.
- [ ] Снять screenshots: composer compact/expanded desktop, composer mobile collapsed/half/full, attachments, popovers.
- [ ] `npm run build` зелёный.

## Definition of Done

- Composer выглядит как быстрый инструмент действия, а не как отдельный dashboard.
- Вложения и параметры доступны, но не мешают основному prompt flow.
- Mobile composer удобен большим пальцем и не съедает экран постоянно.

---

# Этап 5. Detail page → artwork stage + inspector

**Статус:** `[ ]` не начато

## Зачем

Detail page должна помогать рассмотреть результат, понять промпт и при необходимости открыть параметры. Сейчас она ближе к отчётной карточке генерации. Нужно разделить художественную/пользовательскую информацию и технический след.

## Целевая desktop-модель

```txt
┌──────── artwork stage ────────┐ ┌ inspector ┐
│ large image / variants         │ │ prompt    │
│ image actions overlay          │ │ params    │
│                                │ │ files     │
└────────────────────────────────┘ │ technical │
                                   └───────────┘
```

## Целевая mobile-модель

```txt
image stage
primary actions
Prompt | Params | Files | Technical
```

## Что делаем

- Большое изображение становится главным объектом страницы.
- Prompt/params/files/status переезжают в inspector/tabs.
- Technical trace прячется в developer drawer/technical tab.
- Статус запуска перестаёт быть sticky-элементом, который мешает просмотру.
- Actions становятся contextual: download, copy prompt, reuse, delete, open original.

## Затрагиваемые зоны

- `src/features/detail/ImageDetailPage.tsx`;
- `src/features/detail/ImageDetailPage.module.css`;
- `src/features/detail/detailUi.tsx`;
- `src/features/detail/sentParameters.ts`;
- `src/features/detail/model/*`;
- `src/interface/placements/detail.*.placement.ts`;
- `src/app/commands/createDetailCommands.ts`.

## Чеклист

- [ ] Пересобрать desktop detail layout на stage + inspector.
- [ ] Пересобрать mobile detail layout на image-first + tabs/sheets.
- [ ] Убрать sticky/status поведение, которое прилипает к header при scroll.
- [ ] Разделить primary metadata и developer technical data.
- [ ] Проверить multi-result/variant отображение.
- [ ] Проверить image actions.
- [ ] Проверить prompt copy/reuse flow.
- [ ] Проверить missing asset/deleted asset states.
- [ ] Проверить длинные prompt/params без layout overflow.
- [ ] Снять screenshots: detail desktop, detail mobile, technical drawer/tab, long prompt, multi-result.
- [ ] `npm run build` зелёный.

## Definition of Done

- Detail page воспринимается как просмотр результата, а не как лог запуска.
- Техническая информация доступна, но не занимает главный экран.
- Desktop и mobile имеют разные удобные layout.

---

# Этап 6. Settings → workspace object editor

**Статус:** `[ ]` не начато

## Зачем

Settings сейчас — главный источник ощущения “куча карточек и вложенных плашек”. Это нужно переделать структурно: настройки должны стать редактором сущностей, где пользователь выбирает объект и редактирует его в понятной форме.

## Целевая desktop-модель

```txt
┌ settings nav ┐ ┌ entity list ┐ ┌ object editor ┐
│ API          │ │ providers   │ │ selected item │
│ Models       │ │ models      │ │ fields        │
│ Theme        │ │ themes      │ │ validation    │
│ Storage      │ │ ...         │ │ save actions  │
└──────────────┘ └─────────────┘ └───────────────┘
```

## Целевая mobile-модель

```txt
Settings Home
  → Section
    → Entity List
      → Edit Screen
```

## Что делаем

- Убираем nested-dashboard структуру.
- Разделяем settings на:
  - section navigation;
  - entity list;
  - selected object editor.
- Provider/model editor делаем как настоящую форму, а не набор карточек.
- Probe/capability report показываем как compact status + expandable technical details.
- Theme settings показывают реальный preview темы независимо от текущей темы.
- Language selection — простой listbox/command popover.
- Storage/diagnostics — отдельная technical section, без смешивания с обычными настройками.
- На mobile используем route-like flow/full-screen editors.

## Затрагиваемые зоны

- `src/features/settings/SettingsPage.tsx`;
- `src/features/settings/SettingsPage.module.css`;
- `src/features/settings/components/*`;
- `src/features/settings/mobileSettingsPrimitives.css`;
- `src/features/settings/model/*`;
- `src/interface/placements/settings.*.placement.ts`;
- `src/app/commands/createSettingsCommands.ts`;
- `src/app/workspace/state/useSettingsWorkspaceState.ts`.

## Чеклист

- [ ] Спроектировать desktop settings split-view.
- [ ] Спроектировать mobile settings navigation flow.
- [ ] Перенести provider list в compact entity list.
- [ ] Перенести model list в compact entity list.
- [ ] Пересобрать provider editor без лишних nested cards.
- [ ] Пересобрать model editor без лишних nested cards.
- [ ] Сделать save/dirty state очевидным и компактным.
- [ ] Проверить quick check/full probe UI.
- [ ] Спрятать raw capability report в technical drawer/details, а не держать главным блоком.
- [ ] Пересобрать theme previews так, чтобы они показывали целевую тему, а не текущую.
- [ ] Пересобрать language popover/listbox.
- [ ] Проверить long provider/model names.
- [ ] Проверить empty/custom provider states.
- [ ] Проверить mobile edit flow без горизонтального overflow.
- [ ] Снять screenshots: settings API desktop, settings API mobile, theme settings, language popover, provider probe, model editor.
- [ ] `npm run build` зелёный.

## Definition of Done

- Settings ощущаются как рабочий редактор, а не как набор вложенных карточек.
- Desktop использует split-view эффективно.
- Mobile использует отдельный последовательный flow.
- Настройки providers/models/themes/language/storage визуально различимы по смыслу, а не одинаковые панели.

---

# Этап 7. Batch composer → queue/timeline workbench

**Статус:** `[ ]` не начато

## Зачем

Batch composer должен показывать процесс: очередь, интервалы, параллельную обработку, статусы, ошибки и результаты. Карточный список запросов плохо масштабируется и визуально перегружает экран.

## Что делаем

- Переводим batch UI в `TimelineQueue` / queue workbench.
- Каждый request item делаем компактной строкой/элементом очереди.
- Подробности выбранного request показываем в inspector/drawer.
- Batch controls отделяем от списка запросов.
- Progress показываем как общий queue state, а не как набор разрозненных плашек.
- Mobile batch flow делаем как queue list + selected request sheet.

## Затрагиваемые зоны

- `src/features/batch-composer/MultiImageComposer.tsx`;
- `src/features/batch-composer/MultiImageComposer.module.css`;
- `src/features/batch-composer/batchComposerTypes.ts`;
- `src/interface/placements/batch-composer.layout.placement.ts`;
- `src/app/commands/createBatchComposerCommands.ts`;
- batch process modules only if UI requires additional derived state, not behavior changes.

## Чеклист

- [ ] Спроектировать compact queue item.
- [ ] Спроектировать selected request inspector.
- [ ] Перенести per-request details из карточек в inspector/sheet.
- [ ] Упростить batch controls.
- [ ] Проверить interval wording/UI: интервал между отправками, а не между завершениями.
- [ ] Проверить parallel result catching визуально.
- [ ] Проверить retry/cancel/delete controls.
- [ ] Проверить error state.
- [ ] Проверить empty batch state.
- [ ] Проверить mobile selected request sheet.
- [ ] Убрать странный нижний background/fade, если он ещё остался.
- [ ] Снять screenshots: batch desktop, batch mobile, active queue, error item, selected request inspector.
- [ ] `npm run build` зелёный.

## Definition of Done

- Batch composer выглядит как инструмент управления очередью, а не как список тяжёлых карточек.
- Пользователь сразу понимает, что отправлено, что ждёт, что выполняется и что упало.
- Mobile batch flow не перегружает экран.

---

# Этап 8. Popovers, modals и transient UI

**Статус:** `[x]` завершено

## Зачем

Popovers и modals — маленькие элементы, но именно они часто создают ощущение неотполированного UI. Нужно унифицировать их поведение и внешний вид: выбор — как command/listbox, параметры — как sheet/editor, предпросмотр — как media viewer.

## Что делаем

- Приводим все popovers к единому positioning/focus/keyboard поведению.
- Убираем popover-as-card-dashboard вид.
- Для выбора используем compact listbox/command menu.
- Для сложного редактирования используем drawer/sheet/modal editor.
- Attachment preview modal превращаем в более чистый media viewer.
- Parameter modal на mobile делаем full-screen sheet/editor.

## Затрагиваемые зоны

- `src/shared/ui/FloatingPopover/*`;
- `src/shared/ui/PopoverSelect/*`;
- `src/features/parameters/ParametersModal.*`;
- `src/features/parameters/ParameterPanel.*`;
- `src/shared/ui/AttachmentImageStrip/AttachmentPreviewModal.*`;
- composer/settings popover components.

## Чеклист

- [ ] Проверить и унифицировать popover positioning.
- [ ] Проверить focus trap/focus return.
- [ ] Проверить keyboard navigation.
- [ ] Проверить escape/outside click behavior.
- [ ] Упростить language/model/mode popovers.
- [ ] Пересобрать parameter modal под desktop editor и mobile full-screen sheet.
- [ ] Пересобрать attachment preview modal как media viewer.
- [ ] Проверить popovers рядом с краями экрана.
- [ ] Проверить popovers при collapsed sidebar/mobile viewport.
- [ ] Снять screenshots: all known popovers, params modal desktop/mobile, attachment modal desktop/mobile.
- [ ] `npm run build` зелёный.

## Definition of Done

- Popovers ощущаются как часть одной системы.
- Нет самосужающихся/скачущих/выпадающих за экран dropdowns.
- Mobile больше не использует маленькие desktop-popovers там, где нужен sheet.

---

# Этап 9. Info/help page и текстовая гигиена интерфейса

**Статус:** `[ ]` не начато

## Зачем

Info/help screen не должен выглядеть как набор маркетинговых карточек или “объясняющих плашек”. Он должен быть полезным справочником: коротко, по делу, с хорошей навигацией и без декоративного перегруза.

## Что делаем

- Пересобираем Info как справочный layout.
- Убираем лишние декоративные блоки.
- Разделяем quick start, provider setup, generation modes, batch usage, storage/security.
- Делаем якорную навигацию/side toc на desktop.
- На mobile делаем короткие секции с нормальным scroll и sticky mini-nav только если он не мешает.
- Пересматриваем микрокопирайтинг по приложению: меньше рекламного тона, больше конкретных действий.

## Затрагиваемые зоны

- `src/features/workspace/StudioInfoPage.tsx`;
- `src/features/workspace/StudioInfoPage.module.css`;
- i18n entries in `src/i18n` / `src/shared/i18n`.

## Чеклист

- [ ] Пересобрать Info layout.
- [ ] Убрать лишние cards/panels.
- [ ] Сделать readable content width.
- [ ] Добавить desktop TOC/section nav, если уместно.
- [ ] Проверить mobile reading flow.
- [ ] Переписать перегруженные интерфейсные подписи.
- [ ] Проверить RU/EN consistency.
- [ ] Снять screenshots: info desktop/mobile.
- [ ] `npm run build` зелёный.

## Definition of Done

- Info page выглядит как справка инструмента, а не промо-лендинг.
- Тексты помогают действовать, а не украшают UI.

---

# Этап 10. Mobile adaptation hardening

**Статус:** `[x]` завершено

## Зачем

Даже если каждый этап включает mobile, нужен отдельный финальный mobile-проход. Цель — проверить приложение именно как телефонный инструмент: читаемость, большие пальцы, sheets, scroll, отсутствие desktop-паттернов, отсутствие горизонтальных overflow.

## Что делаем

- Проходим все основные user flows на mobile.
- Проверяем, что mobile не выглядит как “desktop в одну колонку”.
- Проверяем scroll во всех длинных страницах.
- Проверяем touch target sizes.
- Проверяем bottom nav/sheets/composer interaction.
- Проверяем, что важные actions доступны без hover.

## Чеклист

- [x] Gallery browsing на mobile.
- [x] Open detail на mobile.
- [x] Reuse/copy/download/delete actions на mobile.
- [x] Composer compact/expanded/full sheet на mobile.
- [x] Attachment add/remove/preview на mobile. `[!]` preview visual still relies on existing detail/attachment fixture coverage.
- [x] Parameters editor на mobile.
- [x] Settings navigation/edit/save на mobile.
- [x] Provider/model selection на mobile.
- [x] Batch queue на mobile.
- [x] Popovers/sheets near viewport edges.
- [x] Long prompt/long settings fields.
- [x] Landscape-ish narrow/wide mobile sanity check.
- [x] No horizontal overflow.
- [x] No blocked page scroll.
- [x] Visual screenshots для всех основных mobile сценариев.
- [x] `npm run build` зелёный.

## Definition of Done

- Mobile версия ощущается спроектированной отдельно.
- Основные действия выполняются удобно без hover и точного мышиного клика.
- Нет scroll/overflow/layout багов.

---

# Этап 11. Motion, performance и визуальная полировка

**Статус:** `[ ]` не начато

## Зачем

После структурного редизайна нельзя вернуть тяжёлые анимации и layout-thrashing. Motion должен помогать ориентации: раскрытия sheets, overlays, инспекторы, переходы между состояниями. Не должен тормозить сайт.

## Что делаем

- Проверяем все новые transitions.
- Убираем анимации, которые трогают layout-heavy свойства без необходимости.
- Проверяем reduced motion.
- Делаем motion language единым: sheets, overlays, inspectors, nav transitions.
- Проверяем производительность при sidebar toggle, page switch, composer sheet, batch updates.

## Затрагиваемые зоны

- `src/styles/layers/motion.css`;
- page/feature CSS modules;
- existing motion performance checks/scripts.

## Чеклист

- [ ] Проверить sidebar collapse/expand.
- [ ] Проверить page transitions.
- [ ] Проверить composer bottom sheet transitions.
- [ ] Проверить gallery overlays.
- [ ] Проверить settings split-view transitions.
- [ ] Проверить batch queue updates.
- [ ] Проверить reduced motion.
- [ ] Запустить существующие motion/performance checks.
- [ ] Снять visual smoke screenshots после motion polish.
- [ ] `npm run build` зелёный.

## Definition of Done

- UI двигается аккуратно, но не тормозит.
- Нет тяжёлых blur/layout анимаций на массовых элементах.
- Reduced motion не ломает понимание интерфейса.

---

# Этап 12. Финальная зачистка, visual QA и release gate

**Статус:** `[x]` завершено

## Зачем

После большого UI-редизайна нужно убрать временные классы, старые карточные leftovers, dead CSS, неиспользуемые primitives и обновить документацию. Иначе новый визуальный долг сразу начнёт накапливаться.

## Что делаем

- Ищем старые surface/card паттерны, которые больше не должны использоваться.
- Удаляем dead CSS/unused components.
- Обновляем docs/screenshots expectations.
- Обновляем release readiness notes.
- Проверяем весь проект через build/static/visual gates.
- Фиксируем итоговый UI contract, чтобы следующие изменения не откатили всё обратно в карточный dashboard.

## Чеклист

- [ ] Найти и удалить dead CSS после редизайна.
- [ ] Найти неиспользуемые components/primitives.
- [ ] Проверить, что `Card`/`Panel` не используются как универсальная обёртка в новых местах.
- [ ] Обновить `docs/ARCHITECTURE_ROADMAP.md`, если появились новые UI rules.
- [ ] Добавить/обновить UI design notes.
- [ ] Запустить `npm run build`.
- [ ] Запустить static checks, если они есть в release pipeline.
- [ ] Запустить screenshot runner для desktop/mobile основных сценариев.
- [ ] Сравнить финальные screenshots с baseline contact sheets.
- [ ] Ручная QA: generation/edit/batch/settings/provider flows.
- [ ] Зафиксировать known limitations, если что-то осталось.

## Definition of Done

- Редизайн завершён как цельная система.
- Старые slop-паттерны не остались в коде как основной путь развития.
- Есть визуальный baseline новой версии.
- Проект готов к следующему функциональному этапу без нового UI-долга.

---

## Сквозной visual QA checklist

Этот чеклист нужно использовать после каждого крупного этапа, выбирая затронутые сценарии.

### Desktop

- [ ] Gallery default.
- [ ] Gallery empty.
- [ ] Gallery with pending task.
- [ ] Gallery filtered/search state.
- [ ] Sidebar expanded.
- [ ] Sidebar collapsed.
- [ ] Composer compact.
- [ ] Composer expanded.
- [ ] Composer attachments.
- [ ] Detail page.
- [ ] Detail with long prompt.
- [ ] Detail technical data.
- [ ] Settings API providers.
- [ ] Settings models.
- [ ] Settings themes.
- [ ] Settings language.
- [ ] Batch composer empty.
- [ ] Batch composer active queue.
- [ ] Info page.
- [ ] Parameter modal.
- [ ] Attachment preview modal.
- [ ] Main popovers/dropdowns.

### Mobile

- [ ] Gallery browsing.
- [ ] Gallery actions without hover.
- [ ] Composer collapsed/expanded sheet.
- [ ] Attachment flow.
- [ ] Detail image-first view.
- [ ] Detail prompt/params/technical sections.
- [ ] Settings home.
- [ ] Settings section list.
- [ ] Settings object editor.
- [ ] Batch queue.
- [ ] Batch selected request.
- [ ] Popovers replaced with sheets where needed.
- [ ] No horizontal overflow.
- [ ] No blocked scroll.

---

## Общий порядок выполнения

Рекомендуемый порядок:

1. Этап 1 — UI principles/surface system.
2. Этап 2 — App shell desktop/mobile.
3. Этап 3 — Gallery.
4. Этап 4 — Composer.
5. Этап 5 — Detail page.
6. Этап 6 — Settings.
7. Этап 7 — Batch composer.
8. Этап 8 — Popovers/modals.
9. Этап 9 — Info/help.
10. Этап 10 — Mobile hardening.
11. Этап 11 — Motion/performance polish.
12. Этап 12 — Final QA/release cleanup.

Почему так:

- Сначала нужны primitives и shell, иначе страницы будут строиться на старых карточных паттернах.
- Gallery + Composer идут рано, потому что это главный ежедневный flow.
- Detail и Settings требуют уже готовых inspector/sheet/list/editor primitives.
- Batch лучше делать после Composer, потому что он использует похожую command/queue логику.
- Popovers/modals лучше полировать после основных страниц, чтобы не переделывать их дважды.
- Mobile hardening идёт отдельным этапом, но mobile решения должны учитываться на каждом этапе.

---

## Запрещённые упрощения

Чтобы редизайн не превратился в косметический перекрас, запрещены такие shortcuts:

- Просто уменьшить padding у старых карточек и считать этап завершённым.
- Заменить одни карточки другими карточками без смены interaction pattern.
- Спрятать весь перегруз в `details`, создав новую матрёшку раскрытий.
- Делать desktop first, а mobile “потом само сожмётся”.
- Дублировать один и тот же UI component в разных местах вместо placement/config.
- Выносить технические данные на главный слой только потому, что “они полезные”.
- Добавлять новые global CSS hacks без владельца.
- Ломать существующую генерацию/storage/provider логику ради визуальных изменений.

---

## Критерии успеха всего редизайна

Редизайн можно считать успешным, если после финального этапа:

- приложение всё ещё узнаётся как Image Studio;
- glass/rounded/dark стиль сохранён, но стал спокойнее и взрослее;
- пользователь видит на каждом экране главное действие, а не набор равноправных блоков;
- карточки используются только там, где они действительно представляют объект;
- technical/debug information доступна, но не захватывает UI;
- desktop использует пространство через inspectors/split views;
- mobile имеет собственную навигацию, sheets и touch-first взаимодействия;
- основные flows стали быстрее: generate, edit, browse, inspect, reuse, batch, configure;
- screenshot contact sheets выглядят как цельный продукт, а не как набор AI-dashboard страниц.

---

## Stage 8.1 — Parameters Modal Redesign Patch

Status: ✅ done

Reason:
- Desktop parameters modal still felt like a centered card editor.
- Parameter navigation needed to become a real side tab rail.
- The modal needed a clearer workspace hierarchy.

Completed:
- [x] Widened and rebalanced the desktop parameters modal shell.
- [x] Reworked the modal into a workspace: header + side navigation + editor area + done action.
- [x] Removed the global `panel-stack` dependency from `ParameterPanel` to avoid display conflicts.
- [x] Turned parameter tabs into a dedicated left rail on desktop.
- [x] Kept mobile as horizontal tab/sheet flow.
- [x] Preserved generation parameter registry, slots, provider logic and state shape.

Validation:
- [x] `npm run build`
- [x] `npm run verify:static`
- [x] desktop/mobile parameters screenshots captured.


---

## Stage 12 — Final architecture and debt audit

Status: ✅ done

Completed cleanup:
- [x] Removed unused `Card` and `Panel` shared primitives after confirming they were not used by the redesigned UI.
- [x] Removed the obsolete `useAttachmentPreviewItems` target/reference preview hook and kept the flat attachment preview hook as the only active composer path.
- [x] Renamed the active attachment preview hook to `useFlatAttachmentPreviewItems`.
- [x] Switched composer/batch attachment imports to shared barrels instead of internal shared subpaths.
- [x] Confirmed there are no native `<select>` controls left in `src`.
- [x] Confirmed there are no active `gallery/inspector`, `GalleryInspector`, `requestOpen`, or `setRequestOpen` leftovers in source code.
- [x] Confirmed architecture boundaries, interface registry, params registry, provider adapters, task lifecycle, storage architecture, CSS architecture, motion architecture, UI accessibility, debt budgets, secrets check, tests and build all pass.
- [x] Ran strict release checks and strict storage audit.
- [x] Captured final desktop/mobile visual baseline for 22 scenarios.

Known non-blocking notes:
- Vite still reports the standard chunk-size advisory for the main client bundle. This is not a failing gate and was not treated as a redesign regression.
- Mobile attachment preview still deserves a separate manual fixture if future QA needs exact modal coverage; current visual baseline covers attachment strips and desktop preview flow.

## Stage 12.1 — Final visual bugfix sweep

Status: done.

Closed manual QA findings after the Stage 12 release cleanup:

- Empty gallery now uses one compact centered state instead of scattered decorative elements.
- Desktop sidebar tabs have clearer spacing.
- Gallery search/filter grouping keeps layout grouping but removes the extra slop border.
- Settings info popovers have a real floating surface with background, border and shadow.
- Redundant model settings summary/action cards were removed.
- Gallery quick actions trigger uses an actual three-dots SVG icon.
- Info page no longer exposes redundant settings/status actions and uses current product-guide wording.
- Detail image stage no longer duplicates status over the image; the topbar has more breathing room.
- Batch detail data is grouped by request first, with prompt/files/parameters/technical sections inside each request.
- Batch selected editor no longer stretches with the queue height.
- Mobile bottom sheets reserve extra bottom safe area.
- Composer and batch prompt fields auto-grow up to several lines and use modest rounded corners.
- Gallery header no longer shows the unexplained History action.
- Mobile batch header is framed as a proper top card.

Validation:

- `npm run release:check` passed.
- Visual pass included desktop/mobile gallery, empty gallery, long prompt composer, quick actions, composer controls, settings models, info, detail, batch composer and batch controls.
