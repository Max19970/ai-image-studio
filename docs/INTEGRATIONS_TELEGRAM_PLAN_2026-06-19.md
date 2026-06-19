# План внедрения интеграций и Telegram-бота

Дата: 2026-06-19  
Статус: этапы 0–8 выполнены  
Область работ: только инфраструктура интеграций и первая интеграция `telegram` — бот + Mini App, открывающее текущий сайт Image Studio.

## Цель

Добавить в Image Studio расширяемый слой интеграций, чтобы подключать приложение к внешним поверхностям без размазывания логики по `SettingsPage`, `StudioSettings`, workspace-командам и текущим provider/generation модулям.

Первой интеграцией становится Telegram:

- новая вкладка настроек `Интеграции`;
- внутри неё под-вкладка `Телеграм`;
- управление токеном бота и параметрами Mini App;
- проверка токена;
- настройка кнопки/команд бота;
- запуск/остановка runtime бота;
- Mini App открывает тот же сайт Image Studio;
- данные Telegram Mini App валидируются на сервере;
- токен не хранится в браузерном `localStorage` и не возвращается в UI в открытом виде.

## Текущее состояние кодовой базы

Фактические точки расширения:

- UI настроек строится через slot/placement registry: `src/interface/placements/settings.*.placement.ts`, `src/features/settings/**/definition.ts`.
- Сейчас вкладки настроек типизированы узко: `SettingsTab = 'interface' | 'generationApi'` в `src/features/settings/settingsTypes.ts`.
- `SettingsPage.tsx` сейчас собирает большой `SettingsSectionContext`, в который уже попали данные интерфейса, API генерации, ComfyUI и команды.
- Сохранение общих настроек идёт через `StudioSettings` и `adapterData`; ComfyUI уже использует `adapterData.comfyui`.
- На сервере есть Express app factory, маршруты через `server/routes/index.ts`, encrypted app-document storage через `server/storage/appDocumentStore.ts`.
- В проекте уже есть архитектурные проверки: `npm run verify:static`, `interface:check`, `arch:check:strict`, `secrets:check`, `storage:check`, `css:check`.

Вывод: интеграции нельзя добавлять как очередной набор полей в текущий `SettingsSectionContext`. Нужен отдельный owner-модуль, иначе вкладка `Интеграции` сразу увеличит связность настроек и создаст долг.

## Архитектурные правила для всей задачи

- Интеграции добавляются через registry/definition, а не через `switch (integrationId)` в UI.
- Telegram-специфика живёт в `telegram` adapter/feature, а generic слой знает только `IntegrationDefinition`, `IntegrationConfig`, `IntegrationStatus`, `IntegrationRuntime`.
- Секреты интеграций серверные: UI может отправить новый токен, но не должен получать сохранённый токен обратно.
- Runtime бота не должен быть частью React-состояния: React только управляет серверным runtime через API.
- Первый релиз Telegram — бот + Mini App launcher. Не трогаем генерацию, галерею, параметры, провайдеры и мульти-запросы.
- Перед каждым этапом делается preflight-симуляция: какие файлы будут затронуты, где есть риск долга, нужен ли предварительный рефакторинг.

## Этап 0 — Baseline и границы изменений

**Цель:** зафиксировать текущее состояние и защититься от случайных правок вне интеграций.

### Preflight-симуляция

Планируемые действия:

- распаковать актуальный архив;
- проверить структуру `src/features/settings`, `src/interface/placements`, `server/routes`, `server/storage`;
- прогнать текущие проверки, если окружение позволяет;
- составить список разрешённых зон изменения.

Риск техдолга: низкий. Этап ничего не меняет в коде.

### Чеклист

- [x] Выполнить `npm install`, если нет `node_modules`. (`npm ci` выполнен.)
- [x] Выполнить `npm run verify:static` или минимум `npm run build && npm test`. (`npm run verify:static` выполнен, exit code 0.)
- [x] Сохранить вывод текущих проверок в stage report. (`docs/INTEGRATIONS_TELEGRAM_STAGE_00_REPORT.md`, raw logs в `artifacts/stage-reports/`.)
- [x] Зафиксировать разрешённые зоны изменения:
  - [x] `src/entities/integrations/**`
  - [x] `src/features/settings/sections/integrations/**`
  - [x] `src/infrastructure/integrations/**` или рядом с текущим API transport
  - [x] `src/integrations/telegram-mini-app/**`
  - [x] `server/integrations/**`
  - [x] `server/routes/integrationRoutes.ts`
  - [x] `server/storage/integrationSettingsStore.ts`
  - [x] `tests/integrations-*.test.ts`
  - [x] `src/shared/i18n/locales/*/settings.json` или отдельный `integrations.json`
  - [x] `src/interface/placements/settings.*.placement.ts`
- [x] Явно отметить запрещённые зоны без необходимости: generation runner, provider adapters, gallery, detail, composer, batch runner.



### Результат выполнения этапа 0

- Рабочая копия развернута из `image-studio-fix-pack-2026-06-19-v2.zip`.
- `npm ci` выполнен успешно.
- `npm run verify:static` выполнен успешно, включая 88 тестов и production build.
- Известный baseline warning: `src/entities/generation-params/comfyui/ComfyUiGenerationSurface.tsx` — 305 строк при warning budget 300. Это существующий небольшой hotspot, он не блокирует этап интеграций и не требует предварительного рефакторинга до generic integration слоя.
- Функциональный код приложения на этапе 0 не менялся.

## Этап 1 — Generic architecture для интеграций

**Цель:** создать расширяемый слой интеграций до добавления Telegram-логики.

### Preflight-симуляция

Наивный вариант:

- добавить `telegramToken`, `telegramBotEnabled`, `telegramMiniAppUrl` прямо в `StudioSettings`;
- расширить `SettingsSectionContext` десятком Telegram-полей;
- добавить условия прямо в `SettingsPage.tsx`.

Проверка долга: такой вариант ухудшает архитектуру. Он смешивает настройки интерфейса, генерации и внешних runtime-интеграций, а для следующей интеграции придётся опять редактировать центральные типы и страницу.

Предварительный рефакторинг перед функциональностью:

- создать generic контракты интеграций;
- вынести интеграционные настройки в отдельный server-backed document;
- сделать UI вкладки самодостаточным, без расширения общего `SettingsSectionContext` под каждую интеграцию.

### Планируемые изменения

- `src/entities/integrations/types.ts`
  - `IntegrationId`
  - `IntegrationDefinition`
  - `IntegrationPublicConfig`
  - `IntegrationSecretPatch`
  - `IntegrationRuntimeStatus`
  - `IntegrationActionResult`
- `src/entities/integrations/registry.ts`
  - клиентский registry доступных интеграций;
  - пока одна запись: `telegram`.
- `server/integrations/types.ts`
  - серверный контракт runtime adapter.
- `server/integrations/registry.ts`
  - registration map для серверных интеграций.
- `src/infrastructure/api.ts` или новый `src/infrastructure/integrations/api.ts`
  - функции `listIntegrations`, `loadIntegrationConfig`, `saveIntegrationConfig`, `startIntegration`, `stopIntegration`, `runIntegrationAction`.

### Чеклист

- [x] Добавить generic types без Telegram-полей в центральных типах. (`src/entities/integrations/types.ts`.)
- [x] Добавить client/server registry. (`src/entities/integrations/registry.ts`, `server/integrations/registry.ts`.)
- [x] Не добавлять зависимости на `features` из `entities`. (Проверено тестом и `arch:check:strict`.)
- [x] Не расширять provider/generation contracts. (Provider/generation зоны не изменялись.)
- [x] Добавить тест, что registry возвращает Telegram как definition, но generic слой не импортирует Telegram UI. (`tests/integrations-registry.test.ts`.)
- [x] Прогнать `npm run arch:check:strict` и `npm run imports:check`. (Также выполнен полный `npm run verify:static`.)


### Результат выполнения этапа 1

- Добавлен isolated generic integration entity layer: `src/entities/integrations/**`.
- Добавлен typed client API boundary: `src/infrastructure/integrations/**`.
- Добавлен server runtime adapter contract и registry: `server/integrations/**`.
- Добавлены contract tests: `tests/integrations-registry.test.ts`.
- `StudioSettings`, `SettingsSectionContext`, provider/generation contracts, gallery, composer и batch runner не изменялись.
- `npm run verify:static` выполнен успешно: 92/92 tests, production build passed.


## Этап 2 — Storage и безопасность секретов

**Цель:** хранить конфиг интеграций отдельно от `StudioSettings`, а токен Telegram — только на сервере.

### Preflight-симуляция

Наивный вариант:

- хранить токен в `StudioSettings.adapterData.telegram`;
- отдавать весь config обратно в UI;
- сохранять token в localStorage вместе с остальными настройками.

Проверка долга/риска: плохо. `adapterData` сейчас относится к provider adapter data, а Telegram token — server runtime secret. Смешивание увеличит риск утечки и сделает `secrets:check` бесполезнее.

Предварительный рефакторинг:

- создать отдельный encrypted bucket `integration-settings.v1`;
- API возвращает `hasToken`, `tokenPreview`, `updatedAt`, но не token;
- token patch принимает пустое значение как “не менять”, специальный флаг как “удалить”.

### Планируемые изменения

- `server/storage/integrationSettingsStore.ts`
  - `loadIntegrationSettings()`
  - `saveIntegrationSettings()`
  - `sanitizeIntegrationSettingsForClient()`
- `server/storage/appDocumentStore.ts`
  - новый bucket `integrationSettingsBucket`.
- `server/routes/integrationRoutes.ts`
  - `GET /api/integrations`
  - `GET /api/integrations/:id/config`
  - `PUT /api/integrations/:id/config`
  - `POST /api/integrations/:id/start`
  - `POST /api/integrations/:id/stop`
  - `POST /api/integrations/:id/actions/:action`
  - `GET /api/integrations/:id/status`

### Чеклист

- [x] Создать отдельное хранилище интеграций. (`integration-settings.v1` через encrypted app document bucket.)
- [x] Не сохранять Telegram token в `StudioSettings`. (Секреты живут только в `server/storage/integrationSettingsStore.ts`.)
- [x] Не возвращать token в client response. (`configured/preview/updatedAt` вместо raw value; action responses дополнительно redacted.)
- [x] Добавить redaction/masking helpers. (`maskSecretValue`, sanitize public values, action result redaction.)
- [x] Добавить тесты normalize/sanitize для интеграционных настроек. (`tests/integrations-storage.test.ts`.)
- [x] Добавить тест, что raw token не появляется в JSON ответа. (Route-level test с adapter, который намеренно пытается вернуть token.)
- [x] Прогнать `npm run secrets:check`. (В составе `npm run verify:static`.)
- [x] Прогнать `npm run storage:check`. (В составе `npm run verify:static`.)

## Результат выполнения этапа 2

- Добавлен encrypted bucket `integration-settings.v1` в `server/storage/appDocumentStore.ts`.
- Добавлен server storage owner для интеграций:
  - `server/storage/integrationSettingsStore.ts`;
  - `server/storage/integration-settings/types.ts`;
  - `server/storage/integration-settings/integrationSettingsCodecs.ts`.
- Добавлена metadata секретов в generic `IntegrationDefinition`: Telegram теперь объявляет `botToken` как secret definition, но generic слой не хранит и не возвращает value.
- Добавлены routes `/api/integrations/**`:
  - `GET /api/integrations`;
  - `GET /api/integrations/:id/config`;
  - `PUT /api/integrations/:id/config`;
  - `GET /api/integrations/:id/status`;
  - `POST /api/integrations/:id/start`;
  - `POST /api/integrations/:id/stop`;
  - `POST /api/integrations/:id/actions/:action`.
- Секреты имеют patch-семантику:
  - непустой `value` обновляет secret;
  - пустой `value` ничего не меняет;
  - `clear: true` удаляет secret.
- Public config возвращает только `configured`, `preview`, `updatedAt`.
- Route-level action results дополнительно редактируются, чтобы adapter не мог случайно вернуть raw token в JSON response.
- `StudioSettings`, provider/generation contracts, gallery, composer и batch runner не изменялись.
- Восстановлена отсутствовавшая в stage1 archive папка `src/data/**` из stage0/fix-pack, потому что без неё baseline tests/build не могли стартовать. Это восстановление проектных ассетов, не новая функциональность.
- `npm run verify:static` выполнен успешно: 94/94 tests, production build passed.
- Новый integration storage был разделён на codec/types/store файлы, чтобы не добавить новый debt warning по файлам >300 строк.



## Этап 3 — Вкладка `Интеграции` в настройках

**Цель:** добавить UI-поверхность управления интеграциями, не превращая `SettingsPage` в хранилище всей бизнес-логики.

### Preflight-симуляция

Наивный вариант:

- дописать `integrations` в `SettingsTab`;
- расширить `SettingsSectionContext` полями `telegramToken`, `telegramStatus`, `startTelegramBot`, etc.;
- управлять всем из `SettingsPage.tsx`.

Проверка долга: частично плохо. Добавить tab id в общий тип допустимо, но Telegram-состояние нельзя поднимать в общий settings context.

Предварительный рефакторинг:

- оставить общий settings context только для выбора активной вкладки;
- интеграционная секция сама загружает и сохраняет свой config через integration API hook;
- sub-tabs внутри `Интеграции` строятся из integration registry.

### Планируемые изменения

- `src/features/settings/settingsTypes.ts`
  - заменить узкий `SettingsTab = 'interface' | 'generationApi'` на расширяемый `SettingsTabId`, либо добавить `'integrations'` как минимальное изменение с комментарием, что конкретные интеграции не попадают в общий context.
- `src/interface/placements/settings.tabs.placement.ts`
  - добавить placement `settings.tabs.integrations`.
- `src/interface/placements/settings.sections.placement.ts`
  - добавить desktop/mobile placements для `settingsSections.integrations`.
- `src/features/settings/sections/integrations/**`
  - `IntegrationsSettingsSection.tsx`
  - `definition.ts`
  - `useIntegrationSettingsDraft.ts`
  - `IntegrationSubTabs.tsx`
  - `TelegramIntegrationPanel.tsx`
  - module CSS рядом с owner-модулем.
- i18n:
  - `settings.tab.integrations`
  - `settings.tab.integrationsHint`
  - `settings.integrations.*`
  - `settings.telegram.*`

### UI-чеклист

- [x] В настройках появилась вкладка `Интеграции`.
- [x] Внутри вкладки есть под-вкладка `Телеграм`.
- [x] Desktop layout визуально согласован с текущими settings cards.
- [x] Mobile layout не превращается в широкую таблицу.
- [x] Кнопки действий отделены от полей конфига.
- [x] Статус бота виден без открытия консоли.
- [x] Ошибки Telegram API выводятся человеком читаемо.
- [x] В общую страницу настроек не добавлена Telegram-логика.
- [x] Прогнать `npm run interface:check`.
- [x] Прогнать `npm run i18n-parity` через существующий `npm test`.

### Результат выполнения этапа 3

- Добавлен tab-level id `integrations` в `SettingsTab` без расширения `SettingsSectionContext` Telegram-полями.
- Добавлены placements:
  - `settings.tabs.integrations`;
  - `settings.sections.integrations.desktop`;
  - `settings.sections.integrations.mobile`.
- Добавлен owner-модуль `src/features/settings/sections/integrations/**`:
  - секция настроек интеграций;
  - registry-driven под-вкладки интеграций;
  - Telegram-панель с server-backed draft hook;
  - локальные стили desktop/mobile.
- Telegram-панель умеет читать/сохранять public config через `/api/integrations/telegram/config`; token вводится как secret patch и не показывается обратно в UI.
- Runtime/status/actions отображаются через generic integration API. Реальный Telegram adapter ещё не реализован, поэтому action-кнопки на этом этапе корректно показывают server error `adapter is not registered`, а не молча ломаются.
- Добавлены ru/en ключи локализации для вкладки, под-вкладки и Telegram-панели.
- Добавлен тест `tests/settings-integrations.test.ts`, который фиксирует placements и проверяет, что Telegram state не попал в `SettingsPage`/центральный settings context.
- `npm run verify:static` пройден по содержанию: architecture/import/interface/storage/css/motion/ui/debt/secrets/tests/build passed. Первый запуск упёрся в лимит tool-timeout на финальном build, после чего `npm run build` и повторный лог подтвердили successful production build.
- Известный warning не изменился: старый ComfyUI hotspot `ComfyUiGenerationSurface.tsx` — 305 строк.

## Этап 4 — Telegram server adapter

**Цель:** реализовать серверный Telegram runtime без внешнего комбайна и без влияния на generation pipeline.

### Preflight-симуляция

Наивный вариант:

- поставить тяжёлую bot framework-библиотеку;
- запускать bot polling прямо из route handler;
- хранить interval/timer глобально без lifecycle;
- мешать Telegram routes с generation routes.

Проверка долга: высокий риск. Для текущей задачи достаточно тонкого клиента к Bot API через встроенный `fetch` Node 22 и явного runtime manager.

Предварительный рефакторинг:

- отделить Telegram HTTP client, config validation, runtime manager и routes action handlers.

### Планируемые изменения

- `server/integrations/telegram/types.ts`
  - config: `botToken`, `miniAppUrl`, `menuButtonText`, `startMessage`, `allowedUserIds`, `launchMode`, `pollingIntervalMs`.
  - public config: без token.
- `server/integrations/telegram/client.ts`
  - `callTelegramApi()`
  - `getMe()`
  - `setChatMenuButton()`
  - `setMyCommands()`
  - `sendMessage()`
  - `getUpdates()`
- `server/integrations/telegram/runtime.ts`
  - start/stop long polling;
  - обработка `/start`;
  - отправка кнопки `Открыть Image Studio` через WebAppInfo;
  - защита по `allowedUserIds`.
- `server/integrations/telegram/adapter.ts`
  - реализация generic `IntegrationRuntimeAdapter`.
- `server/integrations/telegram/miniAppAuth.ts`
  - validation для `Telegram.WebApp.initData`.

### Чеклист

- [x] `Validate token` вызывает `getMe` и показывает имя бота/username.
- [x] `Apply menu button` вызывает `setChatMenuButton` с `MenuButtonWebApp`.
- [x] `Start bot` запускает polling runtime.
- [x] `Stop bot` корректно останавливает polling runtime.
- [x] Runtime не запускается автоматически после сохранения конфига без явного действия пользователя.
- [x] Runtime status содержит `stopped | starting | running | error`.
- [x] `/start` отвечает сообщением и кнопкой Web App.
- [x] Пользователь не из allowlist получает отказ.
- [x] `getUpdates` offset сохраняется только в runtime-состоянии, без загрязнения UI state.
- [x] Webhook mode оставлен как future-ready поле, MVP использует polling.
- [x] Добавить unit tests с mock fetch для Bot API.

### Результат выполнения этапа 4

- Добавлен `server/integrations/telegram/**` как отдельный Telegram owner-layer:
  - `client.ts` — тонкий Telegram Bot API client на встроенном `fetch`;
  - `types.ts` — нормализация runtime-конфига, HTTPS Mini App URL, allowlist, polling mode;
  - `runtime.ts` — явный polling lifecycle start/stop/status;
  - `updateHandler.ts` — обработка `/start`, Web App inline button, allowlist отказ;
  - `adapter.ts` — generic `IntegrationRuntimeAdapter` без UI/generation зависимостей;
  - `miniAppAuth.ts` — HMAC validation для `Telegram.WebApp.initData`.
- Добавлена регистрация встроенного Telegram adapter через `registerBuiltInIntegrationAdapters()` в `server/app.ts`. Регистрация идемпотентна и не ломает тестовые adapter overrides.
- Runtime не стартует при сохранении конфига: запуск происходит только через `start-runtime`/`POST /start`.
- Polling использует `getUpdates` offset только в runtime-памяти, не пишет его в UI/public config.
- Перед polling выполняется `deleteWebhook(false)`, чтобы MVP не конфликтовал с webhook-mode.
- Добавлены unit tests `tests/telegram-integration-adapter.test.ts`: client methods, token validation, menu button, runtime lifecycle, `/start`, allowlist, Mini App initData signature.
- `npm run verify:static` выполнен успешно: 101/101 tests, production build passed.


## Этап 5 — Telegram Mini App runtime на клиенте

**Цель:** позволить сайту корректно открываться внутри Telegram Mini App, не меняя обычный web UX.

### Preflight-симуляция

Наивный вариант:

- просто вставить telegram script в `index.html` и начать читать `initDataUnsafe` в React;
- доверять клиентским данным Telegram;
- менять глобальные CSS/viewport правила для всего сайта.

Проверка долга/риска: средний. Скрипт можно подключить, но Telegram-режим должен быть изолирован, а сервер должен валидировать `initData`.

Предварительный рефакторинг:

- сделать маленький client owner-модуль `src/integrations/telegram-mini-app/**`;
- Telegram-specific CSS variables применять только при наличии `window.Telegram?.WebApp`.

### Планируемые изменения

- `src/integrations/telegram-mini-app/telegramWebApp.ts`
  - safe accessor для `window.Telegram.WebApp`;
  - `ready()`, `expand()`, viewport/theme readings.
- `src/integrations/telegram-mini-app/useTelegramMiniApp.ts`
  - hook для client runtime.
- `src/integrations/telegram-mini-app/auth.ts`
  - отправка `initData` на сервер для validation.
- `server/routes/telegramMiniAppRoutes.ts`
  - `POST /api/integrations/telegram/mini-app/validate`;
  - route вынесен отдельно, чтобы generic integration routes не получили Telegram-specific ветку.
- `index.html`
  - аккуратное подключение Telegram script или dynamic loader.

### Чеклист

- [x] Обычное открытие сайта в браузере работает как раньше.
- [x] В Telegram Mini App вызываются `ready()` и `expand()`.
- [x] UI учитывает Telegram viewport/safe area без ломания desktop/mobile web.
- [x] `initDataUnsafe` не используется как доверенный источник.
- [x] Сервер валидирует `initData` через HMAC и проверяет свежесть `auth_date`.
- [x] Есть понятный fallback, если сайт открыт не из Telegram.
- [x] Нет изменений в composer/gallery/provider flow.

### Результат этапа 5

- Добавлен client owner-модуль `src/integrations/telegram-mini-app/**`:
  - `telegramWebApp.ts` — safe accessor, dynamic Telegram script loader, `ready()`/`expand()`, theme/viewport/safe-area snapshots, scoped CSS variables;
  - `useTelegramMiniApp.ts` — runtime hook, Telegram events, bridge lifecycle, server auth validation;
  - `auth.ts` — client API call на validation endpoint;
  - `types.ts` — публичные типы состояния Mini App.
- `App.tsx` получает только один изолированный hook и scoped data/class attributes; workspace/composer/gallery/provider flow не изменялись.
- Добавлен `server/routes/telegramMiniAppRoutes.ts` с `POST /api/integrations/telegram/mini-app/validate`; endpoint берёт bot token из encrypted integration storage, проверяет HMAC/`auth_date`, опционально применяет allowlist Telegram user id.
- Telegram CSS вынесен как scoped override внутри существующего final CSS layer contract без добавления нового global import, чтобы не ломать CSS architecture check.
- `initDataUnsafe` не используется: клиент отправляет только `WebApp.initData`, доверенные данные возвращаются только после server validation.
- Добавлены tests `tests/telegram-mini-app-client-runtime.test.ts`: bridge theme/safe-area, auth client endpoint shape, изоляция runtime и отсутствие `initDataUnsafe`.
- `npm run verify:static` выполнен успешно: 104/104 tests, production build passed.

## Этап 6 — Telegram panel UX и действия управления

**Цель:** собрать удобную панель управления ботом в настройках.

### Preflight-симуляция

Риск: панель может стать огромной карточкой с кучей полей. Нужно разделить её на компактные зоны: `Подключение`, `Mini App`, `Доступ`, `Запуск`, `Диагностика`.

### Поля панели Telegram

- `Bot token` — secret input, сохранение на сервере, preview сохранённого токена.
- `Mini App URL` — публичный HTTPS URL сайта, который будет открываться в Telegram.
- `Menu button text` — текст кнопки меню бота.
- `Start message` — сообщение на `/start`.
- `Allowed Telegram user IDs` — allowlist владельцев/тестеров.
- `Polling interval` — только если runtime в polling mode.
- `Launch mode` — MVP: polling. Webhook можно показать disabled/future или оставить в типах без UI.

### Действия панели

- `Сохранить конфиг`.
- `Проверить токен`.
- `Настроить menu button`.
- `Запустить бота`.
- `Остановить бота`.
- `Отправить тестовое сообщение` — только если указан test chat/user id.
- `Проверить Mini App auth` — diagnostic endpoint/fallback.

### Чеклист

- [x] Поля не растягивают настройки в неудобную таблицу. (Панель разделена на зоны: подключение, Mini App, доступ, действия, диагностика.)
- [x] Token input не показывает сохранённый токен. (Сохранённый токен виден только как preview metadata.)
- [x] После сохранения видно `token saved`/`token missing`. (Readiness diagnostics показывает состояние saved token.)
- [x] Ошибки Telegram API отображаются в панели диагностики. (Action/auth feedback выводится в diagnostics card.)
- [x] Start/Menu/Test недоступны без сохранённого токена, валидного HTTPS URL и сохранённого конфига; Stop недоступен только когда runtime уже остановлен.
- [x] Поля URL валидируются до отправки action. (`telegramPanelValidation.ts` блокирует config/runtime actions без HTTPS URL.)
- [x] В подсказке указано, что Telegram WebAppInfo требует HTTPS URL.
- [x] В подсказке указано, что для локальной разработки нужен публичный HTTPS tunnel/стенд.


## Результат этапа 6

- Telegram panel UX разделён на компактные зоны: Runtime, Connection, Mini App, Access, Actions, Diagnostics.
- Добавлен helper `telegramPanelValidation.ts` для HTTPS URL validation, chat id normalization, readiness items и disabled action reasons.
- Action-кнопки больше не запускают runtime/config actions со stale form state: если есть несохранённые изменения, сначала требуется сохранить конфиг.
- Добавлен diagnostic action `send-test-message`, который отправляет configured start message с Web App-кнопкой в указанный chat id.
- Mini App auth можно проверить из панели через pasted `initData`; проверка идёт через существующий server validation endpoint.
- `testChatId` и `initData` остаются transient UI diagnostics и не сохраняются в StudioSettings/integration config.
- Добавлены RU/EN copy keys для диагностики, подсказок HTTPS/tunnel, readiness и disabled reasons.
- Добавлены tests `telegram-panel-validation.test.ts`, обновлены Telegram adapter/settings integration tests.
- `npm run verify:static` выполнен успешно: 109/109 tests, production build passed.

## Этап 7 — Тесты и архитектурные проверки

**Цель:** подтвердить, что интеграция добавлена без деградации текущего приложения.

### Preflight-симуляция

Планируемые тесты не должны требовать реального Telegram token. Все Bot API вызовы — через mock fetch.

### Чеклист тестов

- [x] `tests/integrations-storage.test.ts`
  - normalize config;
  - token redaction;
  - secret patch semantics.
- [x] `tests/telegram-bot-client.test.ts`
  - успешный `getMe`;
  - ошибка Bot API;
  - `setChatMenuButton` payload.
- [x] `tests/telegram-mini-app-auth.test.ts`
  - valid HMAC;
  - invalid hash;
  - expired `auth_date`.
- [x] `tests/integrations-routes.test.ts`
  - config read/write;
  - start/stop actions;
  - no raw token in response.
- [x] `tests/settings-integrations.test.tsx` или lightweight DOM test, если текущий test setup позволяет. (`tests/settings-integrations.test.ts`.)
- [x] `npm run imports:check`.
- [x] `npm run interface:check`.
- [x] `npm run storage:check`.
- [x] `npm run secrets:check`.
- [x] `npm test`.
- [x] `npm run build`.
- [x] По возможности `npm run verify:static`. (Direct chain twice reached final `npm run build` and timed out in the shell runner; every component command, including separate `npm test && npm run build`, passed.)

## Результат этапа 7

- Добавлены отдельные focused tests под checklist stage 7:
  - `tests/telegram-bot-client.test.ts` — `getMe`, Bot API error, `setChatMenuButton` payload;
  - `tests/telegram-mini-app-auth.test.ts` — valid HMAC, tampering/invalid hash, expired `auth_date`, missing token/hash;
  - `tests/integrations-routes.test.ts` — config read/write, integration list/status, start/stop routes, route-level secret redaction.
- Существующие tests этапов 2–6 сохранены и продолжают покрывать storage sanitize/secret patch, settings integration placement, Telegram adapter/runtime, Mini App client runtime и Telegram panel validation.
- Реализационный код приложения на этапе 7 не менялся: этап добавил только тесты и документацию/checklist.
- Нет реального Telegram token и внешних Bot API запросов в test suite: все Telegram calls мокируются через `fetch` или test adapter.
- Static verification components passed: architecture/import/interface/storage/css/motion/ui/debt/secrets checks passed; `npm test` passed 117/117; `npm run build` passed separately. Direct `npm run verify:static` reached the final build step twice but timed out in the shell runner while standalone build completed successfully.

## Этап 8 — Visual QA и документация

**Цель:** проверить новую вкладку настроек глазами и зафиксировать эксплуатацию Telegram-интеграции.

### Preflight-симуляция

Риск: visual runner уже проверяет настройки, но сценария `settings-integrations` ещё нет. Добавлять сценарий стоит только для новой вкладки, не трогая старые сценарии без нужды.

### Планируемые изменения

- `scripts/screenshot.config.mjs`
  - добавить scenario `settings-integrations`.
- `docs/TELEGRAM_INTEGRATION.md`
  - как создать bot token через BotFather;
  - как указать Mini App URL;
  - как запустить polling runtime;
  - как настроить menu button;
  - ограничения локальной разработки;
  - security notes про token/allowlist.
- `README.md`
  - короткая ссылка на документ.

### Чеклист

- [x] Сценарий `settings-integrations` снимает desktop/mobile.
- [x] Визуально проверены:
  - [x] Settings → Integrations desktop.
  - [x] Settings → Integrations mobile.
  - [x] Telegram panel с пустым config.
  - [x] Telegram panel с сохранённым token preview/status.
  - [x] Ошибка token validation.
- [x] Targeted screenshot command + screenshot artifact check.
- [x] Документация не обещает webhook MVP, если он не реализован.
- [x] Документация явно говорит, что Mini App URL должен быть публичным HTTPS URL.

## Итоговый definition of done

- [x] Новая вкладка `Интеграции` есть в настройках.
- [x] Под-вкладка `Телеграм` есть внутри `Интеграции`.
- [x] Telegram token сохраняется на сервере и не возвращается в UI открытым текстом.
- [x] Можно проверить токен через `getMe`.
- [x] Можно применить menu button, открывающую Mini App.
- [x] Можно запустить/остановить polling runtime бота.
- [x] `/start` в боте отдаёт кнопку открытия сайта.
- [x] Mini App открывает текущий сайт Image Studio.
- [x] `initData` Mini App валидируется на сервере.
- [x] Allowlist ограничивает доступ к боту в MVP.
- [x] Нет изменений в generation/provider/gallery/composer logic.
- [x] `npm run verify:static` проходит.
- [x] `npm run build` проходит.
- [x] Visual QA новой вкладки пройдено на desktop/mobile.

## Явно не входит в первый релиз

- Генерация изображений прямо из Telegram-чата без открытия Mini App.
- Мульти-пользовательская изоляция всей истории/настроек Image Studio.
- Webhook production deployment wizard.
- Payments/Telegram Stars.
- Attachment menu integration через Telegram Ads Platform.
- Перенос текущего сайта на отдельный remote backend.

## Примечания по Telegram

- Bot API — HTTP API; для MVP достаточно собственного тонкого клиента через `fetch`.
- `getUpdates` и webhooks — взаимоисключающие способы получения updates; MVP выбирает polling, чтобы не требовать публичный webhook.
- `WebAppInfo.url` должен быть HTTPS URL.
- Данные из Mini App должны валидироваться на сервере через `Telegram.WebApp.initData`; `initDataUnsafe` нельзя считать доверенным источником.
