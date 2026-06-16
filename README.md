# Image Studio

Image Studio is a local-first web UI for OpenAI-compatible image generation providers. It combines a React + TypeScript interface with a small Express proxy so API keys do not have to be embedded into the frontend bundle.

The project is intended for personal/local workflows: generating, editing, comparing, and saving image-generation results with rich request controls.

## Features

- Generate images via `/v1/images/generations`.
- Edit images via `/v1/images/edits` with target, reference, and mask attachments.
- Multi-request composer with delayed parallel dispatch.
- Provider and model profiles with custom endpoints, auth header/scheme, custom headers, timeouts, and provider probing.
- Detailed Image API controls: `model`, `prompt`, `n`, `size`, `quality`, `background`, `moderation`, `output_format`, `output_compression`, `stream`, `partial_images`, `response_format`, `input_fidelity`, `user`, `style`, and raw JSON overrides.
- Local encrypted generation history stored in SQLite with Brotli compression and AES-256-GCM encryption.
- Gallery, carousel view, image detail page, request payload preview, downloads, localization, and theme system.
- SSE partial-image streaming support for providers that return OpenAI-like event streams.

## Tech stack

- React
- TypeScript
- Vite
- Express
- SQLite via `node:sqlite`
- Tailwind CSS

## Requirements

- Node.js `22.5.0` or newer. The storage backend uses `node:sqlite`.
- An API key for OpenAI or another OpenAI-compatible image provider.

## Quick start

```bash
npm install
npm run dev
```

Open the client:

```txt
http://127.0.0.1:5173
```

The local proxy listens at:

```txt
http://127.0.0.1:8787
```

## Production-like local run

```bash
npm run build
npm start
```

Then open:

```txt
http://127.0.0.1:8787
```

## Environment variables

Create a local `.env` file from the example:

```bash
cp .env.example .env
```

Common values:

```env
PORT=8787
HOST=127.0.0.1
OPENAI_API_KEY=
DEFAULT_GENERATION_ENDPOINT=https://api.openai.com/v1/images/generations
DEFAULT_EDIT_ENDPOINT=https://api.openai.com/v1/images/edits
DEFAULT_RESPONSES_ENDPOINT=https://api.openai.com/v1/responses
DEFAULT_MODEL_ID=gpt-image-2
```

Optional storage and CORS settings:

```env
IMAGE_STUDIO_DB_PATH=./data/image-studio.sqlite
IMAGE_STUDIO_STORAGE_KEY_FILE=./data/storage.key
IMAGE_STUDIO_STORAGE_KEY=
IMAGE_STUDIO_ALLOWED_ORIGINS=http://127.0.0.1:5173,http://127.0.0.1:5173
IMAGE_STUDIO_JSON_LIMIT=256mb
```

`IMAGE_STUDIO_STORAGE_KEY` can be a 32-byte base64 key or a 64-character hex key. If it is not provided, Image Studio creates `data/storage.key` automatically.

## Provider setup

In the app, open **Settings** and configure a provider:

```txt
Generation endpoint: https://api.openai.com/v1/images/generations
Edit endpoint:       https://api.openai.com/v1/images/edits
Responses endpoint:  https://api.openai.com/v1/responses
Model ID:            gpt-image-2
Auth header:         Authorization
Auth scheme:         Bearer
API key:             your key
```

If `OPENAI_API_KEY` is set in `.env`, the UI API key field can stay empty.

## Security note

Image Studio is a local personal tool, not a ready-to-host SaaS app.

Do not deploy it publicly as-is. Before exposing it to the internet, add server-side provider profiles, user authentication, rate limiting, request logging without secrets, and production-grade secret management.

The default server host is `127.0.0.1` to reduce accidental exposure. Use `HOST=0.0.0.0` only when you intentionally want LAN access and understand the risks.

## Project structure

```txt
src/
  app/                 application composition
  components/          UI components
  domain/              types, defaults, request builder, validation
  i18n/                localization
  infrastructure/      API client, storage, image optimization
server/
  index.ts             local proxy, provider probing, encrypted SQLite storage
docs/
  API_PARAMETERS.md    image API parameter coverage
```

## Notes for GPT Image models

- Custom sizes use `WIDTHxHEIGHT`; for GPT Image 2 both sides should be divisible by 16.
- `background: "transparent"` may not be supported by every model/provider.
- `input_fidelity` is mainly useful for edit-capable models/providers that explicitly support it.
- `response_format` is kept for legacy/DALL·E-compatible providers.

## License

MIT. See [LICENSE](LICENSE).

## Mobile screenshot checks

The project includes a lightweight Puppeteer-based screenshot helper for mobile layout work.

```bash
npm run capture:mobile
```

It builds the app, starts a temporary static server for `dist/client`, seeds a small local demo gallery, opens the main mobile surfaces including the multi-generation composer, and writes phone-sized screenshots to `artifacts/mobile-screenshots`. It uses the system Chromium by default (`/usr/bin/chromium`); set `CHROMIUM_PATH` or `PUPPETEER_EXECUTABLE_PATH` if Chromium lives elsewhere.

For full-page captures instead of viewport captures:

```bash
FULL_PAGE=1 npm run capture:mobile
```
