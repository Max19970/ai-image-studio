# Image Studio — план полного перехода на новую архитектуру

> **Статус: исторический документ.**
>
> Этот план описывает уже завершённую миграцию Image Studio от старой промежуточной архитектуры к текущей модульной базе. Для актуального состояния см. `docs/ARCHITECTURE.md`, для release gates — `docs/RELEASE_READINESS.md`, для debt-zero истории — `docs/TECH_DEBT_ZERO_PLAN.md`.

Версия: 2026-06-17  
Статус: исторический документ; миграция завершена  
Цель: довести проект от промежуточного состояния `old components + new slots/placements` до чистой модульной архитектуры, где UI, процессы, провайдеры, параметры, хранение и стили развиваются независимо.

---

## Легенда статусов

- `[ ]` не начато
- `[~]` в процессе
- `[x]` завершено
- `[!]` требует решения/проверки

---

## 0. Базовая фиксация состояния проекта

**Зачем:** перед большим рефакторингом нужно иметь точку отсчёта: проект собирается, структура понятна, основные зоны долга зафиксированы. Это снижает риск потеряться в середине миграции.

**Что делаем:**

- фиксируем текущую структуру слоёв;
- фиксируем самые тяжёлые файлы;
- фиксируем cross-layer нарушения;
- убеждаемся, что сборка проходит до начала изменений;
- заводим этот чеклист как рабочий документ.

**Чеклист:**

- [x] Распакован актуальный архив проекта.
- [x] Проверена структура `src/app`, `src/components`, `src/features`, `src/entities`, `src/interface`, `src/processes`, `src/providers`, `src/shared`, `server`.
- [x] Найдены главные зоны долга: `global.css`, `src/components`, `App.tsx`, settings API section, provider adapter, blob-oriented storage.
- [x] Выполнена сборка `npm run build`.
- [x] Зафиксирована стратегия миграции в этом документе.

**Definition of Done:**

- есть рабочий план;
- сборка зелёная;
- понятно, что и зачем рефакторим дальше.

---

## 1. Архитектурные правила и границы слоёв

**Зачем:** без явных правил старый слой будет продолжать расползаться. Главная цель этапа — остановить появление нового долга до того, как мы начнём чистить старый.

**Что делаем:**

- формализуем разрешённые направления импортов;
- описываем, куда класть новые UI elements, primitives, feature UI, processes и adapters;
- добавляем документ `docs/ARCHITECTURE_MIGRATION_RULES.md` или расширяем существующий `docs/ARCHITECTURE.md`;
- по возможности добавляем простой script/checker для forbidden imports.

**Целевые правила:**

```txt
app            -> interface, features, entities, processes, infrastructure, shared
interface      -> shared, entities/types only, definitions/placements, context adapters
features       -> entities, processes contracts, interface contracts, shared
entities       -> shared, domain-free pure model code
processes      -> entities, infrastructure boundaries, domain helpers
providers      -> entities/provider contracts, shared
infrastructure -> entities/processes contracts, external IO
shared         -> nothing project-specific
components     -> legacy only; новые импорты туда запрещены
```

**Чеклист:**

- [x] Описать финальные layer rules в `docs/ARCHITECTURE_BOUNDARIES.md`.
- [x] Определить допустимые исключения на время миграции через `scripts/architecture-boundary-baseline.json`.
- [x] Добавить список forbidden imports: `features -> components`, `entities -> components`, `interface -> components`, `components -> features` и дополнительные guardrails для `shared/entities/processes`.
- [x] Добавить lightweight Node script `scripts/check-architecture.mjs`.
- [x] Запустить проверку и сохранить baseline нарушений.
- [x] Запретить добавление новых нарушений через `npm run arch:check`.
- [x] `npm run build` зелёный.

**Definition of Done:**

- новые фичи больше не должны усиливать старую архитектуру;
- известные нарушения зафиксированы как migration debt, а не как норма.

**Результат этапа 1:**

- добавлен `docs/ARCHITECTURE_BOUNDARIES.md`;
- `docs/ARCHITECTURE.md` ссылается на boundary rules;
- добавлен `scripts/check-architecture.mjs`;
- добавлен baseline `scripts/architecture-boundary-baseline.json`;
- добавлены команды `npm run arch:check` и `npm run arch:check:strict`;
- стартовый baseline: `103` импортов в legacy components, `3` legacy components -> features, `7` entity -> UI/composition violations, `0` shared upward violations, `0` process -> UI violations;
- после Этапа 2 baseline обнулён: активных architecture-boundary violations нет.

---

## 2. Разделение `src/components` на legacy и новые целевые зоны

**Зачем:** сейчас `src/components` выглядит как старый склад компонентов, но фактически он всё ещё держит стили, UI и куски логики. Пока это не разобрано, проект будет оставаться гибридом двух архитектур.

**Что делаем:**

- классифицируем каждый файл из `src/components`;
- переносим reusable primitives в `src/shared/ui`;
- переносим feature-specific UI в соответствующие `src/features/**/ui` или `src/features/**/elements`;
- оставшиеся временные компоненты помечаем как legacy;
- обновляем импорты;
- не меняем поведение, только границы.

**Классификация:**

```txt
shared/ui:
  FloatingPopover
  PopoverSelect
  ActionIconButton
  общие modal/button/list primitives

features/composer:
  ImageComposer
  ComposerLayout styles
  attachment preview UI, если оно специфично для composer

features/gallery:
  ResultsGallery
  GallerySlotElements
  gallery card actions/layout styles

features/detail:
  ImageDetailPage
  sentParameters
  detail image/actions/params blocks

features/settings:
  SettingsPage
  settings sections/layout/save actions

features/batch-composer:
  MultiImageComposer
  batch composer types/layout/cards
```

**Чеклист:**

- [x] Составить таблицу всех файлов `src/components` с целевой папкой (`docs/ARCHITECTURE_COMPONENT_MIGRATION.md`).
- [x] Перенести primitives в `src/shared/ui/*`.
- [x] Перенести composer-specific файлы в `src/features/composer/*`.
- [x] Перенести gallery-specific файлы в `src/features/gallery/*`.
- [x] Перенести detail-specific файлы в `src/features/detail/*`.
- [x] Перенести settings-specific файлы в `src/features/settings/*`.
- [x] Перенести generation-parameters UI в `src/features/parameters/*`.
- [x] Перенести workspace shell/info UI в `src/features/workspace/*`.
- [x] Перенести batch-specific файлы в `src/features/batch-composer/*`.
- [x] Удалить `src/components`.
- [x] Исправить все imports.
- [x] Проверить, что `features` больше не импортируют из `components`.
- [x] Проверить, что `entities` больше не импортируют из `components`.
- [x] Обнулить architecture baseline после завершения переноса.
- [x] `npm run arch:check` зелёный.
- [x] `npm run build` зелёный.

**Definition of Done:**

- `src/components` больше не существует как активная архитектурная зона;
- новые компоненты больше не добавляются в старый слой;
- зависимости читаются по смыслу: feature-код лежит в feature, shared-код — в shared;
- `npm run arch:check` показывает `0` нарушений по всем boundary rules.

---

## 3. Разгрузка `App.tsx` и app commands

**Зачем:** `App.tsx` сейчас всё ещё является центральным мозгом приложения. Нам нужно оставить ему роль composition root, а состояние и команды вынести в понятные app-модули.

**Что делаем:**

- выносим workspace state в отдельный hook/store;
- выносим сборку context objects;
- разделяем команды по доменам;
- уменьшаем количество деталей, которые знает `App.tsx`;
- сохраняем внешний UX без изменений.

**Целевая структура:**

```txt
src/app/workspace/
  types.ts
  useWorkspaceState.ts
  useWorkspaceDerivedState.ts
  useWorkspaceCommands.ts
  createWorkspaceContexts.ts
  useWorkspaceViewModel.ts
```

**Чеклист:**

- [x] Выписать все состояния из `App.tsx` и разделить их по зонам: workspace, composer, settings, detail, gallery, modals, batch.
- [x] Создать `useWorkspaceState`.
- [x] Создать `useWorkspaceCommands` или набор специализированных command hooks.
- [x] Вынести derived state в `useWorkspaceDerivedState`: active provider/model, payload, warnings, selected task/image, batch availability.
- [x] Вынести создание context objects из JSX в `createWorkspaceContexts`.
- [x] Создать единый `useWorkspaceViewModel` как app-level composition hook.
- [x] Уменьшить `App.tsx` до композиции shell + detail route + slot hosts.
- [x] Проверить wiring generation submit на уровне TypeScript/build через сохранённый command contract.
- [x] Проверить wiring batch submit на уровне TypeScript/build через сохранённый command contract.
- [x] Проверить wiring restore from history на уровне TypeScript/build через сохранённый command contract.
- [x] Проверить wiring delete/cancel task на уровне TypeScript/build через сохранённый command contract.
- [x] `npm run arch:check` зелёный.
- [x] `npm run arch:check:strict` зелёный.
- [x] `npm run build` зелёный.
- [!] Ручной smoke-test с реальным provider/API key не выполнялся на этом этапе.

**Definition of Done:**

- `App.tsx` не содержит реализации бизнес-сценариев;
- команды живут отдельно;
- контексты собираются централизованно и типизированно;
- `App.tsx` сокращён с ~304 до ~61 строки и теперь отвечает в основном за маршрутизацию detail/workspace и размещение slot hosts.

**Результат этапа 3:**

- добавлена папка `src/app/workspace`;
- добавлен `useWorkspaceState.ts` для workspace/UI state и persistence side effects;
- добавлен `useWorkspaceDerivedState.ts` для вычисляемого состояния: provider/model, payload, warnings, selected task/image, batch state, status text;
- добавлен `useWorkspaceCommands.ts` для app command wiring;
- добавлен `createWorkspaceContexts.ts` для централизованной сборки `WorkspaceSidebarContext`, `WorkspaceMainContext`, `WorkspaceComposerDockContext`, `WorkspaceModalsContext`;
- добавлен `useWorkspaceViewModel.ts` как единая точка сборки state + derived + commands + contexts;
- `src/app/App.tsx` оставлен как composition root;
- активных architecture-boundary violations нет.

---

## 4. Укрепление Definition/Placement системы

**Статус:** завершено.

**Зачем:** новая архитектура должна стать основным способом сборки интерфейса. Компоненты должны определяться один раз, а использоваться через placements без копирования.

**Что делаем:**

- проверяем все текущие placements;
- переносим повторяющиеся UI actions в definitions;
- нормализуем context adapters;
- делаем стабильные id для reusable elements;
- убираем прямую legacy-slot композицию там, где она должна быть definition/placement-based.

**Целевая схема:**

```txt
src/features/**/{elements,sections}/**/definition.ts
src/interface/placements/**/*.placement.ts
src/interface/context/adapters/*.ts
```

**Чеклист:**

- [x] Составить список всех существующих slots (`docs/ARCHITECTURE_INTERFACE_REGISTRY.md`).
- [x] Составить список всех existing placements (`docs/ARCHITECTURE_INTERFACE_REGISTRY.md`).
- [x] Составить список reusable UI elements, которые должны стать definitions.
- [x] Перенести gallery actions в definitions: clear, history, count, delete, download.
- [x] Перенести detail actions в definitions: copy prompt, copy payload, copy params, load composer, download.
- [x] Переиспользовать `imageActions.downloadImage` в gallery footer и detail actions без копирования UI.
- [x] Вынести context adapters в `src/interface/context/adapters/*`.
- [x] Проверить, что один element может использоваться в нескольких placements без копирования.
- [x] Убрать runtime fallback на legacy `src/interface/slots/**/manifest.ts` / `action.tsx`.
- [x] Добавить `npm run interface:check` для проверки registry consistency.
- [x] `npm run interface:check` зелёный.
- [x] `npm run arch:check` зелёный.
- [x] `npm run arch:check:strict` зелёный.
- [x] `npm run build` зелёный.

**Definition of Done:**

- перенос элемента между местами делается правкой placement, а не копированием компонента;
- definitions не знают, где они стоят;
- placements не содержат реализацию UI;
- registry больше не подгружает deprecated legacy slot folders;
- inventory показывает 55 definitions, 61 placements, 40 slots, 5 reusable definitions, 0 active legacy slot runtime files.

**Результат этапа 4:**

- `src/interface/registry.ts` теперь рендерит только resolved definition/placement contributions;
- legacy discovery `src/interface/slots/**/manifest.ts` / `action.tsx` удалён из runtime registry;
- `src/interface/slots/types.ts` оставлен как общий contract для `SlotHost`;
- адаптеры контекста перенесены в `src/interface/context/adapters`;
- `imageActions.downloadImage` используется двумя placements: `gallery.card-footer.download-image` и `detail.actions.download-image`;
- добавлен `scripts/check-interface-registry.mjs`;
- добавлен script `npm run interface:check`;
- добавлен `docs/ARCHITECTURE_INTERFACE_REGISTRY.md`;
- обновлён `docs/ARCHITECTURE.md`.

---

## 5. Полная модуляризация generation params

**Статус:** завершено.

**Зачем:** добавление нового параметра генерации раньше требовало правок в нескольких местах: metadata, UI field, placement, payload builder, snapshots, storage sanitation и restore. Теперь параметр должен быть самодостаточным модулем.

**Что сделано:**

- добавлен logical registry `src/entities/generation-params/logicalRegistry.ts`;
- каждый параметр вынесен в папку `src/entities/generation-params/fields/<param>/`;
- `param.ts` теперь держит copy/options/state/capability/include/snapshot/normalize/restore/payload metadata;
- `definition.ts` держит UI field definition для placement registry;
- broad field groups заменены на отдельные field definitions;
- OpenAI-compatible payload builder теперь собирает параметры через logical registry;
- request snapshots теперь захватываются через param modules;
- storage snapshot sanitation теперь использует param definitions;
- restore from history теперь использует param definitions и payload keys;
- raw JSON overrides остались последним merge-слоем и имеют приоритет над UI-параметрами;
- добавлена проверка `npm run params:check`;
- обновлён `docs/API_PARAMETERS.md`.

**Целевая структура:**

```txt
src/entities/generation-params/fields/quality/
  param.ts
  definition.ts
src/entities/generation-params/fields/size/
  param.ts
  SizeField.tsx
  definition.ts
```

**Чеклист:**

- [x] Описать новый тип `GenerationParamDefinition`.
- [x] Добавить adapter layer между старым registry и новым definition format.
- [x] Перенести `quality` как первый тестовый параметр.
- [x] Перенести `size`.
- [x] Перенести `n`.
- [x] Перенести `output_format`.
- [x] Перенести `background`.
- [x] Перенести `moderation`.
- [x] Перенести `input_fidelity`.
- [x] Перенести `partial_images`.
- [x] Перенести `stream`.
- [x] Перенести `user`.
- [x] Перенести raw JSON overrides.
- [x] Убедиться, что provider capabilities фильтруют поля через definition/placement metadata.
- [x] Убедиться, что request payload строится через definitions/adapter mapping.
- [x] Убедиться, что restore from history работает на уровне command wiring и TypeScript/build.
- [x] Обновить docs/API_PARAMETERS.md.
- [x] `npm run build` зелёный.
- [x] `npm run params:check` зелёный.
- [x] Визуальная проверка через screenshot runner.

**Definition of Done:**

- новый параметр добавляется отдельным модулем;
- UI, capability, serialization, snapshot sanitation и restore logic не размазаны по проекту.

---

## 6. Распил Settings API экрана

**Статус:** завершено.

**Зачем:** `GenerationApiSettingsSection.tsx` слишком большой и станет ещё тяжелее при добавлении провайдеров. Настройки должны быть composable и adapter-aware.

**Что делаем:**

- выносим provider list/editor;
- выносим model list/editor;
- выносим probe/check panel;
- выносим custom headers editor;
- выносим adapter selector/profile;
- переносим draft-state в hook.

**Целевая структура:**

```txt
src/features/settings/sections/generation-api/
  GenerationApiSettingsSection.tsx
  useGenerationApiSettingsDraft.ts
  provider-list/
  provider-editor/
  model-list/
  model-editor/
  provider-check-panel/
  adapter-selector/
  custom-headers-editor/
```

**Чеклист:**

- [x] Вынести provider list desktop/mobile.
- [x] Вынести model list desktop/mobile.
- [x] Вынести provider editor.
- [x] Вынести model editor.
- [x] Вынести adapter selector/profile.
- [x] Вынести custom headers editor.
- [x] Вынести provider check panel.
- [x] Вынести draft mutations в hook.
- [x] Проверить добавление провайдера на уровне build/screenshot smoke.
- [x] Проверить удаление провайдера на уровне build/screenshot smoke.
- [x] Проверить добавление модели на уровне build/screenshot smoke.
- [x] Проверить удаление модели на уровне build/screenshot smoke.
- [x] Проверить apply adapter defaults на уровне TypeScript/build.
- [x] Проверить provider probe wiring на уровне TypeScript/build.
- [x] `npm run build` зелёный.

**Definition of Done:**

- settings API section читается как композиция блоков;
- добавление нового adapter-specific UI не требует раздувать один файл.

---

**Результат этапа 6:**

- `GenerationApiSettingsSection.tsx` сокращён примерно с 599 до 55 строк и теперь отвечает только за композицию секции и переключатель Providers/Models.
- Provider UI разнесён на `provider-list`, `provider-editor`, `adapter-selector`, `custom-headers-editor`, `provider-check-panel`.
- Model UI разнесён на `model-list` и `model-editor`.
- Provider/model draft CRUD, selection, patch helpers и probe-derived state вынесены в `useGenerationApiSettingsDraft.ts`.
- `SettingsPage.tsx` сокращён и теперь держит page-level state: активную вкладку настроек, save/reset, theme selection и active info tooltip.
- Добавлена документация `docs/ARCHITECTURE_SETTINGS_API.md`.
- Выполнены `npm run build`, `npm run arch:check`, `npm run arch:check:strict`, `npm run interface:check`.
- Выполнена визуальная проверка screenshot runner для `settings-api`, `settings-models`, `gallery`, `detail`, `batch-composer` на desktop/mobile.


## 7. Provider architecture v2

**Зачем:** проект хочет быть multi-provider, а не только OpenAI-compatible с изменяемым endpoint. Нужно отделить provider contract от конкретной реализации.

**Что делаем:**

- формализуем общий client/server provider contract;
- разбиваем backend openai-compatible adapter;
- нормализуем ошибки;
- выносим probe suite;
- делаем adapter-specific settings schema;
- готовим место для новых adapter types.

**Целевая server структура:**

```txt
server/providers/openai-compatible/
  adapter.ts
  requestBuilder.ts
  responseParser.ts
  editMultipart.ts
  probeSuite.ts
  upstreamClient.ts
  fixtureImage.ts
  errorNormalizer.ts
```

**Целевая client структура:**

```txt
src/providers/openai-compatible/
  definition.ts
  requestAdapter.ts
  responseAdapter.ts
  settingsSchema.ts
  capabilities.ts
```

**Чеклист:**

- [x] Описать общий `ProviderAdapterContract`.
- [x] Разделить server adapter на request/probe/response/error modules.
- [x] Разделить client request adapter и response adapter, если нужно.
- [!] Вынести adapter-specific settings schema — отложено: текущий OpenAI-compatible settings profile уже зарегистрирован на client-side definition; отдельная schema понадобится при появлении второго реально отличающегося адаптера.
- [x] Вынести provider error normalization.
- [x] Проверить generation endpoint на уровне TypeScript/build и adapter wiring.
- [x] Проверить edit endpoint на уровне TypeScript/build и adapter wiring.
- [x] Проверить multipart images/mask на уровне TypeScript/build и сохранения существующей form construction логики.
- [x] Проверить probe/quick check на уровне TypeScript/build и `providers:check`.
- [x] Проверить upstream error messages на уровне сохранения `extractUpstreamMessage` / `describeFetchFailure`.
- [x] `npm run build` зелёный.
- [x] Визуальная проверка screenshot runner после этапа.

**Definition of Done:**

- новый провайдер добавляется новым adapter-пакетом;
- `server/index.ts` и settings UI не превращаются в свалку provider-specific веток.

**Результат этапа 7:**

- `server/providers/openai-compatible/adapter.ts` сокращён до композиционного файла примерно на 15 строк.
- OpenAI-compatible server adapter разделён на `auth.ts`, `endpoints.ts`, `errorNormalizer.ts`, `fixtureImage.ts`, `multipartEdit.ts`, `probeSuite.ts`, `requestHandlers.ts`, `upstreamClient.ts`.
- Сохранены существующие generate/edit endpoints, multipart image/mask mapping, retry/fetch behavior, quick check, probe suite, provider fingerprint и upstream error messages.
- Добавлена документация `docs/ARCHITECTURE_PROVIDER_ADAPTERS.md`.
- Добавлена проверка `npm run providers:check`, которая не даёт `adapter.ts` снова превратиться в provider-монолит.
- Выполнены `npm run build`, `npm run arch:check`, `npm run arch:check:strict`, `npm run interface:check`, `npm run params:check`, `npm run providers:check`.
- Выполнена визуальная проверка screenshot runner для `gallery`, `settings-api`, `settings-models`, `detail`, `batch-composer` на desktop/mobile.

---

## 8. Generation task lifecycle и scheduler

**Зачем:** генерации, batch, retry, cancel, delete unfinished task и parallel отправка должны быть явной моделью, а не набором ad-hoc состояний.

**Что делаем:**

- описываем task lifecycle;
- вводим scheduler/queue abstraction;
- разделяем mono и batch execution поверх общего механизма;
- нормализуем cancellation;
- делаем удаление незавершённой задачи отменой.

**Целевая модель:**

```txt
created -> queued -> sending -> running -> succeeded
                           -> failed
                           -> cancelled
                           -> deleted
```

**Чеклист:**

- [x] Описать `GenerationTaskLifecycle`.
- [x] Проверить текущие task statuses и привести к единой модели.
- [x] Вынести cancellation registry из app hook, если нужно.
- [x] Ввести scheduler для delayed parallel batch sends.
- [x] Ввести concurrency limit на будущее.
- [x] Унифицировать retry policy mono/batch.
- [x] Убедиться, что delete unfinished task вызывает cancel.
- [x] Убедиться, что удаление batch отменяет незавершённые children.
- [x] Проверить восстановление после refresh.
- [x] `npm run build` зелёный.

**Результат этапа 8:**

- Добавлен явный lifecycle-слой `src/processes/generation-task-lifecycle` со статусами, transitions, cancellation registry, delayed parallel scheduler и shared retry policy.
- `GenerationStatus` расширен до `created/queued/sending/running/retrying/succeeded/failed/cancelled`; legacy `streaming` больше не является persisted task status.
- Mono generation теперь проходит через `queued -> sending -> running/retrying -> succeeded/failed/cancelled`.
- Batch generation теперь использует `runDelayedParallelScheduler`, сохраняя интервал между стартами отправок, а не между завершениями запросов.
- Batch task и batch items получают явные `sending/running/retrying/cancelled` transition states.
- `useGenerationTaskHistory` использует `createTaskCancellationRegistry`; `deleteTask` и `clearTasks` отменяют активные abort controllers перед удалением.
- Восстановление после refresh нормализует активные статусы в `failed` с ошибкой `Interrupted by page reload.`.
- Добавлена документация `docs/ARCHITECTURE_TASK_LIFECYCLE.md`.
- Добавлена проверка `npm run tasks:check`.
- Выполнены `npm run build`, `npm run arch:check`, `npm run arch:check:strict`, `npm run interface:check`, `npm run params:check`, `npm run providers:check`, `npm run tasks:check`.
- Выполнена визуальная проверка screenshot runner для `gallery`, `settings-api`, `settings-models`, `detail`, `batch-composer` на desktop/mobile.

**Definition of Done:**

- состояние задач предсказуемо;
- batch и mono используют общие lifecycle primitives;
- отмена и удаление не являются визуальной иллюзией.

---

## 9. Storage v2: от blob history к нормализованному локальному архиву

**Статус:** завершён. Хвосты первого storage pass закрыты: thumbnails, lazy asset modes, encrypted settings/params/probe-cache documents и save/load smoke test добавлены.

**Зачем:** текущее encrypted blob-хранение норм для старта, но плохо масштабируется для больших галерей, датасетов и долгой истории.

**Что сделали:**

- сохранили backwards compatibility with old encrypted blob;
- подняли `storageSchemaVersion` до `2`;
- добавили миграцию `002_storage_v2_documents`;
- добавили encrypted document buckets через `storage_documents`;
- добавили нормализованные таблицы `generation_tasks` и `generation_task_assets`;
- вынесли top-level и batch image assets из encrypted task document в отдельные encrypted asset documents;
- добавили encrypted thumbnail assets и `thumbnailCount`;
- добавили lazy history modes: `assetMode=full | thumbnail | metadata`;
- добавили отдельный endpoint загрузки full asset по `storageAssetKey`;
- добавили encrypted document buckets для settings, image params и provider probe cache;
- сохранили внешний endpoint contract `/api/storage/generation-tasks`;
- добавили `docs/ARCHITECTURE_STORAGE_V2.md`;
- усилили `npm run storage:check`;
- проверили save/load history/settings/params/probe-cache через временную SQLite DB;
- выполнили визуальную проверку screenshot runner для `gallery`, `settings-api`, `settings-models`, `detail`, `batch-composer` на desktop/mobile.

**Текущая модель:**

```txt
storage_migrations
encrypted_blobs                 # legacy fallback
storage_documents               # encrypted document buckets
generation_tasks                # queryable task metadata
generation_task_assets          # queryable full/thumbnail image asset metadata

buckets:
  generation-task.v2
  generation-task-asset.v2
  studio-settings.v2
  image-params.v2
  provider-probe-cache.v2
```

**Чеклист:**

- [x] Описать storage v2 schema.
- [x] Добавить schema version.
- [x] Добавить migration from current encrypted blob.
- [x] Вынести image assets из task JSON.
- [x] Добавить thumbnails через browser-side `createOptimizedThumbnail` и encrypted thumbnail assets.
- [x] Добавить lazy loading history API modes: `full`, `thumbnail`, `metadata` + single asset endpoint.
- [x] Добавить cleanup orphan assets через full replace/delete current v2 buckets.
- [x] Проверить save/load settings, image params и provider probe cache через encrypted document buckets.
- [x] Проверить save/load history.
- [x] Проверить encrypted/compressed storage после миграции.
- [x] `npm run storage:check` зелёный.
- [x] `npm run build` зелёный.
- [x] Визуальная проверка screenshot runner.

**Definition of Done:**

- история генераций больше не обязана храниться одним огромным encrypted JSON blob;
- task metadata и image asset metadata стали queryable;
- thumbnails и lazy asset modes уже доступны на уровне storage/API;
- можно развивать видимую pagination/virtualization UI, поиск, фильтры, экспорт и очистку без очередного слома storage foundation.

---

## 10. CSS migration: от глобальной свалки к scoped owner modules

**Статус:** завершено.

**Зачем:** `global.css` был главным источником визуального технического долга. Пока компонентные стили, mobile patches и emergency overrides жили в одном глобальном каскаде, UX-правки могли ломать друг друга через порядок и `!important`.

**Что сделано в этом этапе:**

- `src/styles/global.css` превращён в import-only entrypoint;
- Tailwind directives вынесены в `src/styles/tailwind.css`;
- первичный монолит был разрезан на CSS layers;
- popover styles вынесены в `src/shared/ui/FloatingPopover` и `src/shared/ui/PopoverSelect`;
- composer action button / inline popover вынесены в `src/features/composer/ui`;
- workspace info/guides вынесены в `src/features/workspace/StudioInfoPage.module.css`;
- settings select и theme preview styles вынесены в settings feature modules;
- batch micro buttons переведены на shared `Button` primitive + локальные batch styles;
- parameter panel stale globals удалены, владелец — `ParameterPanel.module.css`;
- `mobile.css` стал unlayered final responsive quarantine и больше не использует `!important`;
- пустые compatibility CSS markers `settings.css` и `gallery-batch.css` удалены на Этапе 12;
- добавлена и усилена проверка `npm run css:check`;
- визуальная проверка прогнана после scoped extraction.

**Текущая структура:**

```txt
src/styles/
  global.css
  tailwind.css
  layers/
    base.css
    app-shell-and-primitives.css
    mobile.css
```

**Основные scoped modules после этапа:**

```txt
src/shared/ui/FloatingPopover/FloatingPopover.module.css
src/shared/ui/PopoverSelect/PopoverSelect.module.css
src/features/composer/ui/ActionIconButton.module.css
src/features/composer/ui/ComposerPopover.module.css
src/features/workspace/StudioInfoPage.module.css
src/features/settings/components/SettingsPopoverSelect.module.css
src/features/settings/sections/interface/InterfaceSettingsSection.module.css
src/features/parameters/ParameterPanel.module.css
src/features/batch-composer/MultiImageComposer.module.css
```

**Чеклист:**

- [x] Составить карту крупных блоков `global.css`.
- [x] Сделать `global.css` import-only entrypoint.
- [x] Вынести Tailwind directives в отдельный файл.
- [x] Разнести глобальные стили по доменным CSS layers.
- [x] Добавить `npm run css:check`.
- [x] Задокументировать remaining CSS debt.
- [x] Вынести popover styles в scoped shared UI modules.
- [x] Вынести workspace info styles в feature module.
- [x] Вынести settings styles в feature modules.
- [x] Вынести gallery/batch/parameters leftovers в owner modules или удалить stale globals.
- [x] Сократить `!important` минимум в 2 раза: было 471, стало 4.
- [x] Проверить desktop screenshots.
- [x] Проверить mobile screenshots.
- [x] `npm run css:check` зелёный.
- [x] `npm run build` зелёный.

**Definition of Done:**

- `global.css` больше не является файлом-свалкой;
- основные feature/shared UI стили живут рядом с владельцами;
- новый CSS защищён от возврата селекторов прямо в entrypoint;
- `!important` почти полностью удалён;
- mobile debt изолирован в unlayered responsive quarantine без emergency overrides;
- визуальные сценарии desktop/mobile проверены.

**Результат этапа 10:**

- CSS layer lines сокращены примерно с 5543 до ~2590;
- `!important` сокращён с 471 до 4;
- entry imports сокращены с 9 до 6;
- layer files сокращены с 8 до 5;
- пустые CSS compatibility markers удалены на Этапе 12;
- screenshot runner прогнан по `gallery`, `settings-api`, `settings-models`, `settings-interface`, `detail`, `batch-composer`, `info`, `parameters` на desktop/mobile.

---

## 11. Тесты, проверки и визуальная регрессия

**Статус:** завершён.

**Зачем:** после миграции нужна защита от возвращения лапши. Без тестов каждый новый фикс может незаметно сломать payload, storage или UI.

**Что сделано:**

- добавлен Node test runner через `tsx`;
- добавлены unit tests для чистой логики;
- добавлены единые verify-команды;
- screenshot runner обёрнут в повторяемый visual smoke gate;
- добавлена проверка существования/валидности screenshot artifacts;
- добавлена документация `docs/ARCHITECTURE_TESTING.md`.

**Покрытые зоны:**

```txt
provider request payload
provider response parsing
generation params registry/normalization/snapshot/restore
batch schedule calculation
retry/cancel behavior
storage v2 history/assets/app document buckets
i18n translation key parity
visual screenshot smoke artifacts
```

**Чеклист:**

- [x] Добавить test runner или lightweight test scripts.
- [x] Покрыть request adapter.
- [x] Покрыть response adapter.
- [x] Покрыть generation params registry/definitions.
- [x] Покрыть batch schedule.
- [x] Покрыть retry/cancel.
- [x] Покрыть storage migrations / Storage v2 save-load modes.
- [x] Покрыть i18n parity.
- [x] Добавить architecture boundary check в npm scripts. *(Было добавлено на Этапе 1, теперь входит в `verify:static`.)*
- [x] Добавить единый статический verification script: `npm run verify:static`.
- [x] Добавить visual verification script: `npm run verify:visual`.
- [x] Добавить full verification script: `npm run verify:all`.
- [x] Прогнать screenshot scenarios: gallery, settings-api, settings-models, detail, batch-composer, info, parameters.
- [x] `npm run build` зелёный.

**Новые команды:**

```bash
npm test
npm run visual:check
npm run verify:static
npm run verify:visual
npm run verify:all
```

**Definition of Done:**

- проект не только собирается, но и защищён от типовых регрессий;
- визуальные сценарии проверяются повторяемо через screenshot runner и artifact checker;
- `verify:static` проходит зелёным;
- `verify:visual` проходит зелёным после временного Chromium policy workaround в контейнере.

---

## 12. Финальная зачистка и public-ready polish

**Статус:** завершено.

**Зачем:** после технической миграции нужно убрать хвосты: мёртвый код, устаревшие документы, неактуальные названия, временные compatibility exports.

**Что делаем:**

- удаляем compatibility re-exports;
- удаляем legacy folders;
- обновляем README/CONTRIBUTING/ARCHITECTURE;
- проверяем MIT/public repo readiness;
- фиксируем архитектурную карту проекта.

**Чеклист:**

- [x] Удалить пустой/устаревший `src/components`. *(Выполнено на Этапе 2.)*
- [x] Удалить compatibility re-exports, если все call sites переведены.
- [x] Обновить `docs/ARCHITECTURE.md`.
- [x] Обновить `docs/ARCHITECTURE_ROADMAP.md`.
- [x] Обновить README.
- [x] Обновить CONTRIBUTING.
- [x] Проверить `.env.example`.
- [x] Проверить SECURITY.md.
- [x] Проверить LICENSE.
- [x] Проверить отсутствие секретов/ключей через `npm run secrets:check`.
- [x] Проверить clean build через `npm run verify:static`.
- [x] Проверить screenshot scenarios через `npm run verify:visual` и ручной просмотр contact sheet.
- [x] Подготовить release notes.

**Definition of Done:**

- проект выглядит как цельная платформа, а не как серия патчей;
- публичный репозиторий можно читать и развивать без знания всей истории рефактора.

**Результат этапа 12:**

- удалены неиспользуемые compatibility-фасады и wrappers:
  - `src/app/features.config.ts`;
  - `src/infrastructure/imageOptimization.ts`;
  - `src/infrastructure/storage.ts`;
  - `src/processes/generation-runner/responseMapper.ts`;
  - `renderGenerationParamFields(...)`;
- удалены пустые CSS compatibility markers `settings.css` и `gallery-batch.css`;
- `global.css` теперь импортирует только `tailwind.css`, `base.css`, `app-shell-and-primitives.css`, `mobile.css`;
- обновлены README, CONTRIBUTING, SECURITY, `.env.example`, `docs/ARCHITECTURE.md`, `docs/ARCHITECTURE_ROADMAP.md`, `docs/ARCHITECTURE_CSS_MIGRATION.md`, `docs/ARCHITECTURE_TESTING.md`;
- добавлен `RELEASE_NOTES.md`;
- добавлен `npm run secrets:check`;
- `verify:static` теперь включает secret scan;
- package version поднят до `1.2.1`;
- `npm run verify:static` зелёный;
- `npm run verify:visual` зелёный;
- contact sheet Stage 12 визуально просмотрен;
- post-stage12 UX regression pass исправил центрирование Settings, CSS-module-safe entrance animations, рывки тяжёлых transition-ов и центрирование collapsed sidebar icons;
- `verify:visual` теперь включает сценарий `sidebar-collapsed`.

---

# Порядок выполнения

Рекомендуемый порядок:

1. Этап 1 — правила границ.
2. Этап 2 — разбор `src/components`.
3. Этап 3 — разгрузка `App.tsx`.
4. Этап 4 — укрепление Definition/Placement.
5. Этап 6 — settings API split.
6. Этап 5 — generation params modules.
7. Этап 7 — provider architecture v2.
8. Этап 8 — task lifecycle/scheduler.
9. Этап 9 — storage v2.
10. Этап 10 — CSS migration.
11. Этап 11 — tests/checks/screenshots.
12. Этап 12 — финальная зачистка.

Почему CSS не первым: глобальные стили болезненны, но если сначала перенести компоненты по правильным папкам, станет понятнее, куда именно выносить CSS. Иначе можно просто переложить хаос в другие файлы.

Почему storage не рано: storage v2 важен, но он меньше блокирует архитектурный переход UI/provider слоёв. Его лучше делать после стабилизации task lifecycle.

---

# Текущий прогресс

Текущее состояние после закрытия Этапа 12:

- [x] baseline-аудит сделан;
- [x] сборка проекта проходит;
- [x] ключевые зоны долга определены;
- [x] этап 1 завершён: архитектурные границы описаны и проверяются автоматически;
- [x] этап 2 завершён: `src/components` удалён из активной архитектуры, baseline обнулён;
- [x] этап 3 завершён: `App.tsx` разгружен в `src/app/workspace`;
- [x] этап 4 завершён: Definition/Placement registry стал основным и единственным runtime composition path;
- [x] этап 5 завершён: generation params вынесены в logical modules;
- [x] этап 6 завершён: Settings API экран разрезан на provider/model/editor модули;
- [x] этап 7 завершён: provider architecture v2 разделила OpenAI-compatible adapter;
- [x] этап 8 завершён: task lifecycle/scheduler приведены к единой модели;
- [x] этап 9 завершён полностью: Storage v2 ввёл schema v2, separated full/thumbnail assets, lazy asset modes и encrypted app document buckets;
- [x] этап 10 завершён полностью: scoped CSS extraction сделан для popovers/composer/workspace/settings/batch/parameters, `!important` сокращён с 471 до 4;
- [x] этап 11 завершён: добавлены unit tests, unified verification scripts и visual screenshot smoke gate.
- [x] этап 12 завершён: финальная зачистка, public-ready docs, секрет-скан, release notes, `verify:static` и визуальный smoke pass.
- [x] post-stage12 regression fix завершён: Settings снова центрирован, Info/settings/popover animations восстановлены через local CSS keyframes, тяжёлый grid transition отключён, collapsed sidebar icons выровнены, visual smoke расширен сценарием `sidebar-collapsed`.
