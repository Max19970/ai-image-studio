# Telegram integration

Image Studio can run a local Telegram bot that opens the current Image Studio website as a Telegram Mini App. The first release is intentionally small: it manages a bot token, applies a Mini App menu button, replies to `/start`, validates Mini App `initData`, and runs updates through polling.

## What is included

- A new **Settings → Integrations → Telegram** panel.
- Server-side encrypted storage for the Bot API token.
- Runtime actions: validate token, apply menu button, start bot, stop bot, send a test message.
- A Telegram Mini App client bridge that calls `Telegram.WebApp.ready()` / `expand()` and reads theme, viewport, and safe-area data when the app is opened inside Telegram.
- Server validation for raw `Telegram.WebApp.initData`.
- An allowlist of Telegram user IDs for the MVP bot flow.

## What is not included yet

- Webhook deployment wizard.
- Image generation directly from Telegram chat messages.
- Multi-user history/settings isolation for a hosted public SaaS deployment.
- Telegram payments or Stars.
- File attachment ingestion from Telegram chat.

## 1. Create a bot token

1. Open Telegram and talk to `@BotFather`.
2. Create a new bot with `/newbot`.
3. Copy the Bot API token.
4. In Image Studio, open **Settings → Integrations → Telegram**.
5. Paste the token into **Bot token** and save the config.

The browser never receives the stored token back. The UI only receives whether the token is configured and a short preview.

## 2. Configure the Mini App URL

Set **Mini App URL** to the public URL where users can open Image Studio.

Important constraints:

- Telegram Web App buttons require an HTTPS URL.
- A local URL such as `http://127.0.0.1:5173` or `http://localhost:8787` will not work from Telegram clients.
- For local development, use a temporary public HTTPS tunnel or a staging deployment.
- The MVP opens the existing Image Studio UI. It does not create a separate Telegram-only frontend.


## 2.1. Run through Cloudflare Tunnel

For a local public Mini App, expose the production server, not the Vite dev client.

Example `.env` for `https://comfybottg.space`:

```env
HOST=127.0.0.1
PORT=8787
IMAGE_STUDIO_PUBLIC_URL=https://comfybottg.space
IMAGE_STUDIO_ALLOWED_HOSTS=comfybottg.space
IMAGE_STUDIO_ALLOWED_ORIGINS=http://127.0.0.1:8787,http://localhost:8787,https://comfybottg.space
```

Then run:

```bash
npm run build
npm run start
```

`npm run start` loads `.env`, `.env.local`, and environment-specific `.env.*` files automatically before the Express server imports provider, storage, CORS, or integration modules. Shell environment variables still win over `.env` values.

### Optional tunnel autostart

The production server can also start `cloudflared` automatically after Express begins listening:

```env
IMAGE_STUDIO_TUNNEL_AUTOSTART=true
IMAGE_STUDIO_TUNNEL_COMMAND=cloudflared
```

With no custom args, Image Studio runs a quick tunnel equivalent to:

```bash
cloudflared tunnel --url http://127.0.0.1:8787
```

For a stable custom hostname such as `https://comfybottg.space`, prefer a named Cloudflare Tunnel and set args to the exact command you would normally run manually. A token-based connector works well for local autostart:

```env
IMAGE_STUDIO_TUNNEL_ARGS=tunnel --no-autoupdate --protocol http2 run --token <TOKEN>
```

`--protocol http2` is optional, but it can avoid QUIC/DNS resolver stalls on some Windows networks.

`IMAGE_STUDIO_TUNNEL_ARGS` supports `${HOST}`, `${PORT}`, `${targetUrl}`, and `${IMAGE_STUDIO_TUNNEL_TARGET_URL}` placeholders.

Point the Cloudflare Tunnel public hostname to:

```txt
http://127.0.0.1:8787
```

The root page and static assets are served by the same Express server. CORS is mounted only on `/api/**`, so static production assets are not blocked by the API CORS allowlist.

## 3. Apply the Telegram menu button

After saving the token and Mini App URL:

1. Click **Validate token** to verify the saved token through `getMe`.
2. Click **Apply menu button**.

The server calls `setChatMenuButton` with a `MenuButtonWebApp` payload and the configured Mini App URL. It also registers `/start` as a bot command.

## 4. Start the polling runtime

Click **Start bot** in the Telegram panel.

The MVP uses polling through `getUpdates`, not webhooks. Before polling starts, the runtime calls `deleteWebhook(false)`, because Telegram bots cannot use `getUpdates` while a webhook is active.

Click **Stop bot** to stop the polling timer and clear runtime handles. The runtime state is not started automatically just because the config was saved; start/stop are explicit user actions.

## 5. Use `/start`

When the runtime is running, send `/start` to the bot from Telegram.

The bot responds with the configured start message and an inline Web App button that opens the Mini App URL.

If **Allowed Telegram user IDs** is not empty, only listed users receive the `/start` response. Use comma-separated numeric Telegram user IDs, for example:

```txt
111111111, 222222222
```

Do not put bot tokens or API keys in the allowlist field.

## 6. Validate Mini App sessions

When Image Studio is opened inside Telegram, the client can send raw `Telegram.WebApp.initData` to:

```txt
POST /api/integrations/telegram/mini-app/validate
```

The server validates the HMAC with the saved bot token and checks `auth_date` freshness. `initDataUnsafe` is never treated as trusted data; it can be useful for UI convenience only after the server-side `initData` validation succeeds.

## 7. Diagnostics

The Telegram panel contains a **Diagnostics** block:

- readiness cards show whether token, HTTPS URL, saved config, and runtime state are OK;
- **Send test** sends a message with the Web App button to a numeric chat ID or `@channelusername`;
- **Check Mini App auth** validates a pasted `initData` sample through the server endpoint.

Actions use the saved server-side config. When the form has unsaved changes, runtime/menu/test actions stay disabled until the config is saved.

## Security notes

- The bot token is stored in the server integration settings bucket, not in `StudioSettings` and not in browser localStorage.
- API responses redact secret values. The UI only sees configured state, preview, and update timestamps.
- Do not deploy Image Studio publicly as-is. Add real authentication, CSRF/origin hardening, rate limits, audit logs, and per-user storage isolation before hosting it for multiple users.
- Treat the allowlist as an MVP protection for bot replies, not as complete app authentication.
- Rotate the Bot API token in BotFather if it was pasted into logs, screenshots, issues, or shared chat messages.

## Development checks

Useful focused verification commands:

```bash
npm run verify:static
npm run capture:screenshots -- --viewports=desktop,mobile --scenarios=settings-integrations --out=artifacts/telegram-integration-screens
npm run capture:screenshots -- --viewports=desktop,mobile --scenarios=settings-integrations-empty,settings-integrations-validation-error --out=artifacts/telegram-integration-screens-extra
```

The screenshot runner mocks `/api/integrations/**` for Telegram settings scenarios, so visual smoke checks do not need a real Telegram token.
