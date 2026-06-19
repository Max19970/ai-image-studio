# Integrations / Telegram — Stage 05 Report

Дата: 2026-06-19

## Цель

Добавить client-side Telegram Mini App runtime так, чтобы Image Studio корректно открывался внутри Telegram Mini App и при этом обычный web UX не менялся.

## Preflight-симуляция и архитектурное решение

Наивный путь — подключить Telegram script в `index.html`, читать `initDataUnsafe` в React и глобально менять CSS под Telegram. Он был отклонён по двум причинам:

1. `initDataUnsafe` нельзя считать доверенным источником данных.
2. Глобальные CSS/viewport правки легко сломали бы обычный desktop/mobile web.

Принятое решение:

- отдельный client owner-модуль `src/integrations/telegram-mini-app/**`;
- dynamic loader Telegram WebApp script только при признаках Telegram launch params / Telegram user agent;
- `App.tsx` получает только hook + scoped `data-*`/class attributes;
- server validation endpoint вынесен в отдельный route file `server/routes/telegramMiniAppRoutes.ts`, чтобы generic `integrationRoutes.ts` не получил Telegram-specific ветвление;
- Telegram CSS добавлен как scoped block в существующий `mobile.css`, потому что CSS architecture checker разрешает фиксированный набор global imports/layers.

## Изменения

### Client

- `src/integrations/telegram-mini-app/types.ts`
  - typed state для auth/theme/viewport/safe-area.
- `src/integrations/telegram-mini-app/telegramWebApp.ts`
  - safe accessor `getTelegramWebApp()`;
  - dynamic script loading;
  - `ready()`/`expand()` support через hook;
  - theme, viewport, `safeAreaInset`, `contentSafeAreaInset` snapshots;
  - scoped CSS variable application on `document.documentElement`.
- `src/integrations/telegram-mini-app/auth.ts`
  - `POST /api/integrations/telegram/mini-app/validate`;
  - клиент отправляет только raw `initData`.
- `src/integrations/telegram-mini-app/useTelegramMiniApp.ts`
  - lifecycle hook;
  - Telegram events: `themeChanged`, `viewportChanged`, `safeAreaChanged`, `contentSafeAreaChanged`;
  - server-side auth validation.
- `src/app/App.tsx`
  - подключен `useTelegramMiniApp()`;
  - добавлены scoped `telegram-mini-app`, `data-telegram-mini-app`, `data-telegram-platform`, `data-telegram-auth-state`.

### Server

- `server/routes/telegramMiniAppRoutes.ts`
  - `POST /api/integrations/telegram/mini-app/validate`;
  - token берётся из encrypted integration settings;
  - validation выполняется через `validateTelegramMiniAppInitData()`;
  - дополнительно применяется `allowedUserIds` allowlist.
- `server/routes/index.ts`
  - route зарегистрирован отдельно после generic integration routes.

### CSS

- Scoped Telegram Mini App overrides добавлены в `src/styles/layers/mobile.css` без нового import/layer file.
- Ordinary web получает прежний CSS, потому что selectors активируются только через `.studio-app.telegram-mini-app` / `:root[data-telegram-mini-app="true"]`.

### Tests

- `tests/telegram-mini-app-client-runtime.test.ts`
  - bridge reads Telegram theme and safe-area viewport;
  - auth client posts only `initData`;
  - runtime is isolated and does not use `initDataUnsafe`.

## Проверки

- `npm run verify:static` — passed.
- `npm test` — 104/104 passed.
- `npm run build` — passed.
- `arch:check:strict` — 0 violations.
- `imports:check` — 0 cycles.
- `css:check` — passed.
- `secrets:check` — passed.
- `debt:check` — passed with existing ComfyUI 305-line warning only.

## Ограничения / следующий этап

- Реальная проверка внутри Telegram клиента не выполнялась в контейнере.
- Visual screenshot run не выполнялся на этом этапе: UI вне Telegram не должен изменяться, а Telegram-specific selectors требуют Telegram runtime attributes.
- Следующий этап: Telegram panel UX и более явная диагностика действий управления.
