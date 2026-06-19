# Image Studio — план поддержки локальной генерации / ComfyUI

Дата: 2026-06-19  
База: `image-studio-stage10-focus-prompt-final-scrollfix-settingsheader.zip`  
Статус: план перед реализацией

## Легенда статусов

- `[ ]` не начато
- `[~]` в работе
- `[x]` готово
- `[!]` заблокировано / требует решения
- `[?]` требует ручной проверки

## Проверенная исходная архитектура

- [x] Архив проекта распакован и просмотрен.
- [x] Найдены текущие provider-слои:
  - `server/providers/registry.ts`
  - `server/providers/types.ts`
  - `server/providers/openai-compatible/*`
  - `src/entities/provider/*`
  - `src/providers/openai-compatible/*`
- [x] Найдены текущие точки сборки request payload:
  - `src/entities/provider/request.ts`
  - `src/providers/openai-compatible/requestAdapter.ts`
  - `src/domain/generationSnapshots.ts`
  - `src/processes/generation-runner/singleRunner.ts`
  - `src/processes/batch-runner/requestBuilder.ts`
- [x] Найдены текущие UI-точки выбора модели и Control menu:
  - `src/features/composer/ImageComposer.tsx`
  - `src/features/composer/elements/control-menu/ComposerControlMenuAction.tsx`
  - `src/features/batch-composer/sections/draft-toolbar/BatchDraftToolbarSection.tsx`
  - `src/entities/provider/modelOptions.ts`
- [x] Найдены текущие настройки провайдеров/моделей:
  - `src/features/settings/sections/generation-api/*`
  - `src/features/settings/settingsTypes.ts`
  - `src/domain/studioSettings.ts`
  - `src/domain/providerSettings.ts`
- [x] Найден текущий слой параметров генерации:
  - `src/entities/generation-params/*`
  - `src/features/parameters/ParameterPanel.tsx`
- [x] Найдена текущая страница деталей:
  - `src/features/detail/sections/snapshot/DetailSnapshotSections.tsx`
  - `src/features/detail/sentParameters.ts`

## Главный архитектурный вывод

Текущий проект уже хорошо подготовлен к новым провайдерам: есть server/client provider adapters, registries, SlotHost/placements, request adapters, response adapters, storage v2 и process-layer для single/batch generation.

Но текущая система параметров всё ещё в основном завязана на общий `ImageParams` и OpenAI-compatible payload. Для ComfyUI это опасно: если добавлять `steps`, `cfg`, `sampler`, `scheduler`, `denoise`, `seed`, `loras`, `vae`, `clipSkip` и прочие поля прямо в общий `ImageParams`, каждое новое семейство провайдеров начнёт раздувать общую модель состояния. Поэтому перед полноценным ComfyUI нужно сделать provider-owned generation surface.

## Внешние допущения по ComfyUI

Начальная интеграция должна строиться вокруг нативного ComfyUI server API:

- базовый локальный адрес по умолчанию: `http://127.0.0.1:8188`;
- получение доступных моделей/папок: `/models`, `/models/{folder}`;
- introspection нод: `/object_info`, `/object_info/{node_class}`;
- постановка workflow в очередь: `POST /prompt`;
- прогресс: `/ws?clientId=...`;
- результат: `/history/{prompt_id}` + загрузка файлов через `/view`;
- загрузка файлов для будущих workflow: `/upload/image`, `/upload/mask`;
- отмена/очередь: `/queue`, `/interrupt`.

На первом проходе поддерживаем только text-to-image через заранее контролируемый workflow template. Image-to-image/inpaint/ControlNet не включаем, чтобы не смешать старую OpenAI-compatible модель вложений с ComfyUI workflow inputs.

## Общий протокол каждого этапа

Перед началом каждого этапа создаётся preflight-документ:

```txt
docs/COMFY_LOCAL_STAGE_XX_PREFLIGHT.md
```

Шаблон:

```md
# Comfy/local stage XX preflight

## Цель этапа

## Планируемые изменения

## Затрагиваемые файлы

## Симуляция результата

- Новый пользовательский сценарий:
- Новый data flow:
- Что останется неизменным:
- Что будет расширено добавлением, а не редактированием старой логики:

## Debt/architecture gate

- Provider-specific код не протекает в feature UI:
- Новые параметры не раздувают общий ImageParams:
- Settings не превращаются в набор if adapterId === ...:
- Detail page не хардкодит ComfyUI поля:
- Storage сохраняет старые задачи без миграционных поломок:
- Batch/single runner не получают provider-specific ветвления:
- CSS локален, без глобальных заплаток:
- Accessibility/keyboard для новых popover/dropdown сохранены:

## Нужен ли предварительный рефакторинг

## Проверки после этапа

## Итоговый статус
```

Если симуляция показывает рост техдолга, сначала выполняется маленький refactor-stage, потом функциональная часть.

## Глобальные правила реализации

- [x] Не добавлять ComfyUI как `if (adapterId === 'comfyui')` по всему UI.
- [x] Не обращаться к ComfyUI напрямую из браузера; всё через локальный Express proxy.
- [x] Не добавлять все ComfyUI-параметры в общий `ImageParams`.
- [x] Не ломать OpenAI-compatible сценарии генерации/редактирования.
- [ ] Не менять batch scheduler: интервал остаётся между стартами отправок.
- [ ] Не смешивать текущие OpenAI attachments с ComfyUI workflow inputs.
- [ ] Любые ComfyUI resources — checkpoints, LoRA, samplers, schedulers — получать через adapter-owned resource endpoint/cache.
- [ ] Все новые UI-элементы заводить через owner modules / shared primitives / placements, а не копированием существующих компонентов.
- [ ] После каждого этапа обновлять этот чеклист.

---

# Этап 0 — Baseline, план в репозитории и границы MVP

## Цель

Зафиксировать стартовую точку, добавить этот план в `docs/`, определить точные границы MVP: ComfyUI text-to-image + выбор checkpoint + подключение зарегистрированных LoRA + provider-specific детали.

## Preflight-симуляция

- [x] Создать `docs/COMFY_LOCAL_GENERATION_PLAN_2026-06-19.md`.
- [x] Создать `docs/COMFY_LOCAL_STAGE_00_PREFLIGHT.md`.
- [x] Зафиксировать текущий список provider/param/settings/detail точек.
- [x] Зафиксировать, что MVP не включает image-to-image, inpaint, ControlNet и произвольные пользовательские workflow templates.

## Debt gate

- [x] Не начинать с ComfyUI UI до provider/params contract v2.
- [x] Не добавлять временные поля `steps/cfg/sampler` в общий `ImageParams`.
- [x] Не менять поведение существующей OpenAI-compatible генерации.

## Проверки

- [x] `npm run verify:static`
- [x] `npm run build`

## Definition of Done

- [x] План лежит в `docs/`.
- [x] Понятно, что входит в MVP, а что остаётся под будущие workflow presets.
- [x] Есть baseline перед кодом.

---

# Этап 1 — Provider adapter contract v2: resources, capabilities, local providers

## Цель

Расширить provider contract так, чтобы ComfyUI мог быть добавлен как самостоятельное семейство, а не OpenAI-compatible под маской.

## Планируемые изменения

- [x] Расширить client adapter definition:
  - `capabilities`: `supportsGenerate`, `supportsEdit`, `supportsImageAttachments`, `supportsMask`, `supportsStreaming`, `usesLocalWorkflow`, `hasLiveResources`.
  - `resources?`: описание доступных provider resources: checkpoints, loras, samplers, schedulers.
  - `generationSurface`: новая provider-owned стратегия параметров.
  - `detailDescriptor`: provider-owned описание request snapshot для страницы деталей.
- [x] Расширить server adapter definition:
  - `fetchResources(provider, kind)` или отдельный contract для provider resources.
  - `fetchGenerate` оставить главным входом генерации.
  - `fetchEdit` может возвращать controlled unsupported error у ComfyUI MVP.
- [x] Добавить server route:
  - `POST /api/provider/resources` с `{ provider, kind }`.
- [x] Обновить `scripts/check-provider-adapters.mjs`, чтобы новый adapter был обязан объявлять capabilities/resources/surface.

## Симуляция результата

OpenAI-compatible adapter объявляет существующие возможности. ComfyUI позже сможет объявить `supportsEdit: false`, `supportsImageAttachments: false`, `hasLiveResources: true`, не заставляя composer/detail/settings знать внутренности ComfyUI.

## Debt gate

- [x] Никаких ComfyUI-веток в `ImageComposer`, `ParameterPanel`, `DetailSnapshotSections`.
- [x] Provider routes выбирают adapter через registry.
- [x] OpenAI-compatible adapter остаётся зелёным через compatibility wrapper.

## Проверки

- [x] `npm run providers:check`
- [x] `npm run verify:static`

## Definition of Done

- [x] Adapter contract готов к non-OpenAI provider.
- [x] Старый provider работает без визуальных изменений.

---

# Этап 2 — Provider-owned generation surface вместо раздувания ImageParams

## Цель

Сделать параметры генерации расширяемыми добавлением provider-owned стратегий, а не добавлением новых полей в общие структуры на каждый провайдер.

## Планируемые изменения

- [x] Ввести новый контракт, условно:

```ts
interface ProviderGenerationSurface {
  id: string;
  getDefaultState(provider): Record<string, unknown>;
  normalizeState(value, provider): Record<string, unknown>;
  getTabs(context): GenerationSurfaceTab[];
  renderSlot(slot, context): ReactNode[];
  buildPayload(context): Record<string, unknown>;
  captureSnapshot(context): ProviderRequestParameterSummary;
  restoreSnapshot(previous, snapshot): Record<string, unknown>;
}
```

- [x] Оставить старые OpenAI params как `openAiCompatibleGenerationSurface`, который внутри использует текущие logical params.
- [x] Добавить в `ImageParams` только один extension-bucket, например:

```ts
providerParams?: Record<string, Record<string, unknown>>;
```

или выделить `GenerationDraftState`, если preflight покажет, что так чище.

- [x] Перевести `ParameterPanel` на adapter surface:
  - tabs берутся из surface;
  - поля берутся из surface;
  - tab stats берутся из surface;
  - hidden provider params считаются surface-стратегией.
- [x] Обновить snapshot/restore:
  - общий prompt/retry остаётся общим;
  - provider-specific параметры уходят в `snapshot.providerParams` / `snapshot.parameterSummary`.

## Симуляция результата

Чтобы добавить `cfg` или `sampler` для ComfyUI, больше не нужно менять общий `ImageParams` тип, defaults, snapshot Pick и OpenAI payload serializers. ComfyUI surface сама сообщает, какие поля есть, как их нормализовать, как показать, как сериализовать и как восстановить.

## Debt gate

- [x] Не переносить весь текущий params registry в один generic form renderer.
- [x] Не ломать existing logical params; они становятся одной реализацией surface.
- [x] Не делать `Record<string, unknown>` единственным источником правды без нормализатора strategy.

## Проверки

- [x] `npm run params:check`
- [x] `npm run providers:check`
- [x] `npm test`
- [x] `npm run verify:static`

## Definition of Done

- [x] Новые provider параметры можно добавлять через новую surface-реализацию.
- [x] OpenAI-compatible параметры визуально и функционально не изменились.

## Итог этапа 2

- [x] Введён request-safe surface для payload/snapshot/restore.
- [x] Введён UI surface для `ParameterPanel`.
- [x] Добавлен extension-bucket `ImageParams.providerParams`.
- [x] OpenAI-compatible параметры остались первой surface-реализацией поверх старого logical registry.
- [x] `ParameterPanel` больше не читает вкладки/рендер напрямую как единственный источник правды; он работает через surface активного провайдера.
- [x] Snapshot/restore умеет хранить `surfaceId`, `providerParams`, `parameterSummary`.
- [x] UI-surface и request-surface разведены, чтобы не тянуть React/CSS/import.meta.glob в request/domain слой.


---

# Этап 3 — Новый model picker: provider → model popover

## Цель

Заменить плоский dropdown моделей на полноценный popover выбора: слева/сверху провайдеры, рядом/ниже модели выбранного провайдера. Trigger показывает provider + model.

## Планируемые изменения

- [x] Создать reusable domain element:
  - `src/entities/provider/ui/ProviderModelPicker.tsx`.
  - Причина выбора owner module: picker работает с provider/model entity view-model и используется не только в composer.
- [x] Данные строить не плоским `getProviderModelOptions`, а группированной моделью:

```ts
ProviderModelGroup {
  providerId;
  providerName;
  providerAdapterId?;
  models: ProviderModelOption[];
  disabled;
  selected;
}
```

- [x] Desktop: `FloatingPopover` с двухпанельным layout.
- [x] Mobile: `BottomSheet` с compact provider rail + model list.
- [x] Использовать новый picker в:
  - single composer Control menu;
  - batch draft toolbar.
- [x] Не трогать settings active model selector в этом этапе: preflight показал, что это отдельный settings UX-сценарий и его лучше не смешивать с composer/batch picker.
- [x] Trigger copy:
  - первая строка: имя модели;
  - вторая строка: имя провайдера.

## Симуляция результата

Пользователь не выбирает “модель из общей каши”, а явно видит “провайдер → модель”. Это особенно важно при ComfyUI, где модель/checkpoint привязана к локальному provider endpoint.

## Debt gate

- [x] Не удалять `PopoverSelect`, потому что он нужен другим select-like настройкам.
- [x] Не делать provider/model picker composer-only, если batch использует тот же паттерн.
- [x] Keyboard navigation и outside click идут через существующие popover/sheet primitives.

## Проверки

- [x] `npm test` — 62 passed, 0 failed.
- [x] `npm run build`.
- [x] `npm run verify:static`.
- [x] Visual smoke:
  - `composer-controls` desktop/mobile;
  - `composer-model-picker` desktop/mobile;
  - `batch-composer-controls` desktop/mobile;
  - `batch-model-picker` desktop/mobile.

## Definition of Done

- [x] Выбор модели работает через provider/model popover.
- [x] В выбранной модели видны и model label, и provider label.
- [x] Старые модели OpenAI-compatible выбираются как раньше, но понятнее.

---

# Этап 4 — Compatibility policy при смене provider/model

## Цель

При смене на ComfyUI очищать неподдерживаемые вложения и не оставлять UI в невалидном режиме.

## Планируемые изменения

- [x] Добавить helper:

```ts
sanitizeComposerForProviderCapabilities(state, providerCapabilities)
```

- [x] При `setModel(modelId)`:
  - определить provider/capabilities новой модели;
  - [x] если `supportsEdit === false`, принудительно вернуть mode=`generate`;
  - [x] если `supportsImageAttachments === false`, очистить target/reference images;
  - [x] если `supportsMask === false`, очистить mask;
  - [x] показать мягкое status/warning-сообщение, если что-то очищено.
- [x] То же для batch drafts:
  - [x] при смене модели конкретного draft очищать только этот draft;
  - [x] не трогать остальные draft-и.
- [x] Restore from detail должен тоже проходить через sanitizer.

## Симуляция результата

Если пользователь работал с OpenAI edit и выбрал ComfyUI, старые image/mask attachments не попадут в ComfyUI payload и не сломают генерацию.

## Debt gate

- [x] Никаких `if comfyui then clear` — только capability policy.
- [x] Очистка вложений не должна происходить при смене между provider-ами с одинаковой поддержкой.
- [x] Batch и single должны использовать один helper/policy.

## Проверки

- [x] Unit test на sanitizer.
- [x] Unit test на restore/sanitizer path с unsupported mode/attachments.
- [x] `npm run verify:static`

## Definition of Done

- [x] Provider switch безопасен.
- [x] ComfyUI не получает старые OpenAI attachments.

## Итог этапа 4

- [x] Добавлен capability-driven sanitizer в `src/entities/provider/compatibility.ts`.
- [x] Single composer, settings, batch drafts и restore используют command-layer policy.
- [x] Добавлено мягкое notice-сообщение при автоматической очистке неподдерживаемых частей запроса.
- [x] OpenAI-compatible provider не потерял текущие edit/images/mask сценарии.
- [x] Проверки и visual smoke пройдены; первый debt-budget рост был устранён выносом вспомогательной логики из composer commands.

---

# Этап 5 — Server-side ComfyUI adapter foundation

## Цель

Добавить серверный adapter `comfyui`, который умеет проверять локальный ComfyUI, читать resources и выполнять базовую text-to-image генерацию.

## Планируемые изменения

- [x] Создать:

```txt
server/providers/comfyui/
  adapter.ts
  settingsSchema.ts
  endpoints.ts
  resources.ts
  workflowTemplates.ts
  requestHandlers.ts
  responseMapper.ts
  errorNormalizer.ts
  probeSuite.ts
  http.ts
```

- [x] Settings schema:
  - reuse `generationEndpoint` как ComfyUI base URL;
  - timeout;
  - optional custom headers на будущее, без смешивания с OpenAI auth UX.
- [x] Resources:
  - checkpoints: `/models/checkpoints` или fallback через `/object_info/CheckpointLoaderSimple`;
  - loras: `/models/loras` или fallback через `/object_info/LoraLoader`;
  - samplers/schedulers: `/object_info/KSampler`.
- [x] Generate flow:
  1. build API workflow JSON from template;
  2. inject prompt, checkpoint, seed, size, sampler, scheduler, steps, cfg, LoRA stack;
  3. `POST /prompt` with `client_id`;
  4. MVP monitor через `/history/{prompt_id}` polling;
  5. collect output image refs;
  6. fetch bytes via `/view`;
  7. return JSON compatible with app response mapper.
- [x] Cancellation MVP:
  - abort browser request stops waiting in Image Studio through adapter `ProviderFetchContext.signal`;
  - queued prompt deletion / `/interrupt` intentionally not used in MVP, because `/interrupt` can affect global ComfyUI execution.

## Симуляция результата

Server adapter полностью скрывает ComfyUI workflow mechanics. Client получает нормализованный ответ с base64 images, а галерея/детали продолжают работать через существующий task lifecycle.

## Debt gate

- [x] ComfyUI workflow template не лежит внутри React UI.
- [x] No direct ComfyUI fetch from client.
- [x] `/interrupt` не используется без осознанной политики, чтобы не отменять чужие задачи в ComfyUI.
- [x] Adapter.ts остаётся composition entry, не гигантским файлом.

## Проверки

- [x] Unit tests с mocked HTTP ComfyUI для resources.
- [x] Unit tests для workflow injection.
- [x] Unit tests для response mapper.
- [x] Unit test для mock generation flow.
- [x] `npm run providers:check`
- [x] `npm run verify:static`

## Definition of Done

- [x] Server умеет получить checkpoints/loras/sampler/scheduler data.
- [x] Server умеет выполнить mock ComfyUI generation flow.
- [x] OpenAI-compatible routes не затронуты.

## Итог этапа 5

- [x] Зарегистрирован server adapter `comfyui`.
- [x] Добавлены ComfyUI capabilities/resources/probe/generate handlers.
- [x] Workflow generation изолирован от UI и OpenAI-compatible request builder.
- [x] Response normalized в текущий формат галереи: `data[].b64_json`.
- [x] Provider adapter checker теперь проверяет ComfyUI server modules и маленький composition `adapter.ts`.
- [x] Static verification зелёная: 70 tests passed, build passed, debt budget без предупреждений.

---

# Этап 6 — Client-side ComfyUI adapter и request/response surface

## Цель

Добавить клиентский adapter `comfyui`, который строит provider-specific payload и описывает параметры/детали UI.

## Планируемые изменения

- [x] Создать client adapter:

```txt
src/providers/comfyui/
  definition.ts
  requestAdapter.ts
  responseAdapter.ts
  settingsSchema.ts
  index.ts
```

- [x] Создать provider-owned surface:

```txt
src/entities/generation-params/comfyui/
  state.ts
  requestSurface.ts
  ComfyUiGenerationSurface.tsx
  index.ts
```

- [x] Payload ComfyUI MVP:

```ts
{
  workflowKind: 'txt2img-basic',
  prompt,
  checkpoint,
  width,
  height,
  seed,
  steps,
  cfg,
  sampler,
  scheduler,
  batchSize,
  loras: [{ id, loraName, strengthModel, strengthClip }]
}
```

- [x] Surface tabs для ComfyUI:
  - `Модель`: checkpoint + registered LoRA stack;
  - `Сэмплер`: sampler, scheduler, steps, cfg, denoise;
  - `Кадр`: width, height, batch size;
  - `Seed`: seed mode / seed value;
  - `Вывод`: output format if relevant;
  - `Повтор`: общий retry policy.
- [x] `createSubmitProxyRequest` для ComfyUI отправляет JSON на `/api/generate`, но adapterId=`comfyui`.
- [x] Response adapter собирает images из нормализованного server JSON.

## Симуляция результата

Для UI ComfyUI выглядит как полноценный provider с собственными параметрами, а не как OpenAI-compatible API с raw JSON.

## Debt gate

- [x] ComfyUI UI params живут в provider-owned surface; request-safe state отделён от React UI.
- [x] No Comfy-specific checks в `ParameterPanel`.
- [x] No Comfy-specific response parsing в `src/infrastructure/api.ts`.

## Проверки

- [x] Adapter contract tests.
- [x] Payload build tests.
- [x] Snapshot capture/detail summary tests.
- [x] `npm run verify:static`

## Definition of Done

- [x] Client adapter готов и включён в registry.
- [x] ComfyUI параметры не загрязнили общие OpenAI params.

## Итог этапа 6

- [x] Зарегистрирован client adapter `comfyui`.
- [x] Добавлен provider-owned ComfyUI surface через `ImageParams.providerParams.comfyui`.
- [x] Payload/snapshot/detail summary работают без React-зависимостей.
- [x] `ParameterPanel` и `infrastructure/api.ts` остались provider-agnostic.
- [x] `verify:static` зелёный: 72 tests passed, build passed, debt/import checks passed.


---

# Этап 7 — Settings: ComfyUI provider, checkpoint models, LoRA registry

## Цель

В настройках генерации добавить поддержку ComfyUI как локального provider-а: endpoint, live resources, checkpoint model dropdown и registry LoRA.

## Планируемые изменения

- [x] Расширить settings model без жёсткой привязки к ComfyUI:

```ts
StudioSettings {
  providers;
  models;
  selectedModelId;
  adapterData?: Record<string, unknown>;
}
```

- [x] Добавить `ComfyUiSettingsData`:

```ts
{
  loras: Array<{
    id;
    displayName;
    loraName;
    notes;
    defaultStrengthModel;
    defaultStrengthClip;
  }>;
  resourceCache?: {...};
}
```

- [x] В Settings раздел генерации добавить отдельную вкладку/подвкладку `ComfyUI`:
  - список зарегистрированных LoRA;
  - кнопка refresh resources;
  - создание/удаление LoRA registration;
  - display name;
  - dropdown фактической LoRA из ComfyUI;
  - default strengths.
- [x] Model editor:
  - для OpenAI-compatible — старое поле `modelId`;
  - для ComfyUI — стилизованный dropdown checkpoints, не `<select>`;
  - fallback ручной input только если resources недоступны, с явным warning.
- [x] Provider editor:
  - adapter selector умеет менять форму settings fields;
  - ComfyUI provider показывает base URL + resources через отдельную ComfyUI вкладку.

## Симуляция результата

Пользователь регистрирует ComfyUI provider, обновляет список ресурсов, выбирает checkpoint из реального списка ComfyUI, регистрирует LoRA под удобным именем и дальше выбирает её в генерации.

## Debt gate

- [x] Settings не превращаются в `if ComfyUI` внутри общего editor-а; adapter-owned settings fields/renderers.
- [x] LoRA registry не хранится как часть OpenAI model.
- [x] Resource dropdown использует общий styled popover primitive.
- [x] ComfyUI draft logic вынесена из общего settings hook.

## Проверки

- [x] Settings normalization tests.
- [x] Resource cache tests.
- [x] `npm run interface:check`
- [x] `npm run debt:check`
- [x] `npm run verify:static`
- [x] Visual: settings desktop/mobile.

## Definition of Done

- [x] ComfyUI provider настраивается в UI.
- [x] Checkpoint model выбирается из live resources.
- [x] LoRA registry работает через настройки.

## Итог этапа 7

- [x] Добавлен `StudioSettings.adapterData`.
- [x] Добавлен `ComfyUiSettingsData` с LoRA registry и resource cache.
- [x] Добавлена вкладка `ComfyUI` в Settings / API генерации.
- [x] Model editor получил checkpoint dropdown для ComfyUI provider-а.
- [x] Provider editor стал adapter-field driven.
- [x] `verify:static` зелёный: 76 tests passed, build passed, debt/import/interface checks passed.

---

# Этап 8 — Provider-specific Control menu

## Цель

Control menu должен менять содержимое по capabilities/provider surface: для ComfyUI нет переключения generate/edit, есть model picker, LoRA quick connect и параметры ComfyUI.

## Планируемые изменения

- [x] Ввести `ComposerControlSurface` или расширить placements/context так, чтобы menu sections приходили от adapter/capabilities.
- [x] OpenAI-compatible menu:
  - mode generate/edit;
  - attachments/mask;
  - model picker;
  - parameters;
  - batch.
- [x] ComfyUI MVP menu:
  - model picker;
  - LoRA quick picker / selected LoRA summary;
  - parameters;
  - batch;
  - no generate/edit toggle;
  - no old OpenAI attachments/mask controls in MVP.
- [x] Если будет добавлен ComfyUI-specific file workflow позже, завести отдельный attachment strategy, не использовать старую target/reference/mask семантику.

## Симуляция результата

На ComfyUI пользователь не видит недоступное редактирование и не может случайно отправить OpenAI-style attachments. Но может быстро выбрать checkpoint, LoRA и параметры.

## Debt gate

- [x] Не копировать весь `ComposerControlMenuAction.tsx` ради ComfyUI.
- [x] Menu sections должны быть composable.
- [x] Batch draft toolbar использует ту же модель выбора/LoRA summary, где уместно.

## Проверки

- [x] Component/unit tests на menu surface selection.
- [x] `npm run verify:static`
- [x] Visual: composer-controls desktop/mobile.

## Definition of Done

- [x] Control menu реально provider-aware.
- [x] ComfyUI MVP UI не показывает edit/attachments, которые не поддерживаются.

---

# Этап 9 — Provider-specific details page

## Цель

Страница деталей должна отображать информацию по adapter descriptor, а не хардкодить OpenAI-compatible sent parameters.

## Планируемые изменения

- [x] Расширить `GenerationRequestSnapshot`:

```ts
provider: {
  adapterId;
  providerId?;
  providerLabel;
  modelId;
  modelLabel;
}
parameterSummary: Array<{ group; label; value; technicalKey? }>;
technical?: Record<string, unknown>;
```

- [x] OpenAI-compatible detail descriptor строит старые rows из payload/params.
- [x] ComfyUI detail descriptor строит rows:
  - provider/base URL;
  - checkpoint;
  - LoRA stack;
  - size/batch;
  - seed;
  - sampler/scheduler/steps/cfg/denoise;
  - workflow kind;
  - prompt id;
  - output node(s).
- [x] `DetailSnapshotSections` заменить на provider descriptor renderer.
- [x] Batch item details используют descriptor каждого item, потому batch может содержать разные providers.

## Симуляция результата

Генерация через ComfyUI в деталях выглядит не как странный OpenAI payload, а как ComfyUI run summary. Старые OpenAI задачи отображаются как раньше.

## Debt gate

- [x] Никакого ComfyUI labelMap в `sentParameters.ts`.
- [x] Snapshot sanitizer сохраняет старые задачи и новые provider metadata.
- [x] Batch aggregate не теряет provider diversity.

## Проверки

- [x] Detail descriptor tests.
- [x] Storage codec tests for old/new snapshots.
- [x] `npm run verify:static`
- [x] Visual: detail page desktop/mobile.

## Definition of Done

- [x] Detail page adapter-aware.
- [x] ComfyUI details полезны человеку, а не только разработчику.

---

# Этап 10 — End-to-end ComfyUI generation MVP

## Цель

Провести полный сценарий: выбрать ComfyUI provider/checkpoint, выбрать параметры/LoRA, отправить prompt, получить результат в галерее, открыть детали, восстановить запрос.

## Планируемые изменения

- [x] Включить ComfyUI adapter в client/server registries.
- [x] Добавить default ComfyUI provider preset, но не делать его активным без выбора пользователя.
- [x] Добавить empty/error states:
  - ComfyUI не запущен;
  - checkpoints не найдены;
  - выбранная LoRA больше не существует;
  - workflow validation failed;
  - history/view fetch failed.
- [x] Уточнить retry behavior для локальной генерации.
- [x] Уточнить long timeout defaults для локального provider-а.

## Симуляция результата

Сайт остаётся тем же Image Studio: главная страница, prompt, gallery, details. Меняется только выбранный provider/model и provider-owned параметры.

## Debt gate

- [x] Single/batch runner не знают про ComfyUI workflow internals.
- [x] Gallery не знает про provider type.
- [x] Storage сохраняет images так же, как OpenAI results.

## Проверки

- [x] Unit tests + mocked integration tests.
- [ ] Manual local ComfyUI smoke test, если окружение доступно.
  - В контейнере не выполнялся: нужен локальный ComfyUI пользователя с checkpoints/LoRA.
- [x] `npm run verify:static`
- [x] `npm run verify:visual`

## Definition of Done

Подробности выполнения: `docs/COMFY_LOCAL_STAGE_10_REPORT.md`.


- [x] ComfyUI text-to-image работает end-to-end на mocked integration; live smoke оставлен для локального ComfyUI.
- [x] Результаты попадают в галерею и детали.
- [x] Restore request работает.

---

# Этап 11 — Batch support для ComfyUI

## Цель

Убедиться, что мульти-генерация работает с ComfyUI без отдельной ветки batch runner-а.

## Планируемые изменения

- [ ] Batch drafts проходят через тот же providerContextForModel.
- [ ] Provider capabilities чистят unsupported attachments для каждого draft.
- [ ] Batch detail descriptor показывает разные providers/models/loras по items.
- [ ] Интервал между отправками сохраняется.
- [ ] Resource errors одного draft-а не ломают всю очередь, если остальные валидны.

## Симуляция результата

Можно создать несколько ComfyUI запросов с разными checkpoints/LoRA/seed и отправить их через существующий batch scheduler.

## Debt gate

- [ ] Не создавать `comfyBatchRunner`.
- [ ] Не нарушать delayed parallel scheduler.
- [ ] Не делать global Comfy queue lock без необходимости.

## Проверки

- [ ] Batch runner tests.
- [ ] Mock ComfyUI batch tests.
- [x] `npm run verify:static`
- [ ] Visual: batch composer.

## Definition of Done

- [ ] ComfyUI batch работает через общий process-layer.

---

# Этап 12 — UX polish, accessibility, visual verification

## Цель

Довести UI до аккуратного состояния: provider/model picker, settings ComfyUI tab, Control menu, parameters, details, mobile.

## Планируемые изменения

- [ ] Проверить keyboard navigation во всех новых popovers.
- [ ] Проверить mobile bottom sheets.
- [ ] Проверить empty/error states.
- [ ] Проверить, что ComfyUI settings не ломают визуальный ритм страницы настроек.
- [ ] Добавить/обновить screenshot scenarios:
  - `composer-comfy-controls`
  - `settings-comfyui`
  - `parameters-comfyui`
  - `detail-comfyui`
  - `model-picker`

## Симуляция результата

Новые экраны выглядят как часть Image Studio, а не как приделанная панель локальной генерации.

## Debt gate

- [ ] Не добавлять новую крупную глобальную CSS-прослойку.
- [ ] Новые CSS modules рядом с владельцами.
- [ ] Не плодить вложенные карточки/табличный UI без причины.

## Проверки

- [ ] `npm run verify:visual`
- [ ] Ручной просмотр скриншотов desktop/mobile.
- [x] `npm run verify:static`

## Definition of Done

- [ ] Визуальные сценарии проверены.
- [ ] UI не выглядит шаблонно/ломано.

---

# Этап 13 — Docs, release notes, final audit

## Цель

Зафиксировать новую архитектуру и пользовательский сценарий.

## Планируемые изменения

- [ ] Обновить `docs/PROVIDER_ADAPTER_CONTRACT.md`.
- [ ] Обновить `docs/GENERATION_PARAM_PLUGIN_CONTRACT.md` или добавить `docs/PROVIDER_GENERATION_SURFACE.md`.
- [ ] Обновить README:
  - как подключить ComfyUI;
  - как запустить ComfyUI server;
  - как выбрать checkpoints/LoRA;
  - ограничения MVP.
- [ ] Обновить release notes.
- [ ] Финальный audit document:
  - что реализовано;
  - что не вошло;
  - какие future stages открыты.

## Проверки

- [ ] `npm run release:check`
- [ ] `npm run release:visual`
- [ ] `npm run verify:all`

## Definition of Done

- [ ] Функция задокументирована.
- [ ] Проверки зелёные.
- [ ] Ограничения честно описаны.

---

# Future stages после MVP

- [ ] ComfyUI workflow presets: txt2img, img2img, inpaint, ControlNet, IPAdapter.
- [ ] Workflow template editor/importer.
- [ ] Provider-specific attachment strategies для ComfyUI upload/image и upload/mask.
- [ ] Preview/progress updates из WebSocket в текущий task UI.
- [ ] Queue management UI: pending/running ComfyUI jobs.
- [ ] Per-provider resource cache invalidation.
- [ ] ComfyUI Manager / custom nodes diagnostics.
- [ ] Валидация совместимости checkpoint/LoRA/workflow.

## Первый этап реализации

Начинать нужно с этапа 0, затем этап 1 и этап 2. До завершения этапа 2 не стоит делать ComfyUI UI, потому что иначе почти гарантированно придётся либо раздувать `ImageParams`, либо хардкодить ComfyUI в общих feature-компонентах.
