# Image Studio

Image Studio is a local-first web UI for OpenAI-compatible image generation APIs. It combines a React + TypeScript client with a small Express proxy so provider keys can stay outside the frontend bundle.

The app is built for personal workflows: image generation, image editing, multi-request batches, provider/model profiles, request inspection, local encrypted history, and visual comparison of generated results.

## Features

- Single image generation through OpenAI-compatible `/v1/images/generations` endpoints.
- Image editing through multipart `/v1/images/edits` endpoints with target, reference, and mask attachments.
- Multi-request composer with delayed parallel dispatch, retry policy, cancellation, and per-item status tracking.
- Provider/model profiles with custom endpoints, auth header/scheme, custom headers, timeouts, capability probing, provider cache, adapter-owned settings schemas, and provider-specific parameter profiles.
- Rich Image API controls: `model`, `prompt`, `n`, `size`, `quality`, `background`, `moderation`, `output_format`, `output_compression`, `stream`, `partial_images`, `response_format`, `input_fidelity`, `user`, `style`, retry policy, raw JSON overrides, and provider-filtered parameter availability.
- Local encrypted Storage v2: SQLite metadata, Brotli-compressed AES-256-GCM documents, separated full image assets, thumbnail assets, lazy asset loading, encrypted settings, encrypted image params, encrypted provider probe cache, diagnostics, audit, and benchmark tooling.
- Archive-oriented gallery with search, filters, sort, progressive paging, filtered cleanup, thumbnail-first loading, and lazy full-asset hydration.
- Gallery, carousel view, detail page, request payload preview, downloads, localization, theme previews, and mobile layouts.
- SSE partial-image streaming support for providers that return OpenAI-like event streams.
- Architecture safety checks, strict debt budgets, unit tests, storage audit, and repeatable screenshot smoke checks.
- Telegram bot + Mini App integration for opening Image Studio inside Telegram, with server-side token storage and runtime controls.

## Requirements

- Node.js `22.5.0` or newer. The storage backend uses `node:sqlite`.
- An API key for OpenAI or another OpenAI-compatible image provider.
- Chromium is optional, but needed for visual screenshot checks.

## Quick start

```bash
npm install
cp .env.example .env
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

Optional storage, CORS, and development settings:

```env
IMAGE_STUDIO_DB_PATH=./data/image-studio.sqlite
IMAGE_STUDIO_STORAGE_KEY_FILE=./data/storage.key
IMAGE_STUDIO_STORAGE_KEY=
IMAGE_STUDIO_PUBLIC_URL=
IMAGE_STUDIO_ALLOWED_HOSTS=
IMAGE_STUDIO_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
IMAGE_STUDIO_JSON_LIMIT=256mb
IMAGE_STUDIO_PROXY_TARGET=http://127.0.0.1:8787
```

`IMAGE_STUDIO_STORAGE_KEY` can be a 32-byte base64 key or a 64-character hex key. If it is not provided, Image Studio creates `data/storage.key` automatically.

`npm run start` loads `.env`, `.env.local`, and environment-specific `.env.*` files automatically. For Cloudflare Tunnel / Telegram Mini App, add your public HTTPS origin to `IMAGE_STUDIO_ALLOWED_ORIGINS` and optionally set `IMAGE_STUDIO_PUBLIC_URL`, for example `https://comfybottg.space`.

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

## Project structure

```txt
src/
  app/              application composition, workspace state, and app commands
  domain/           pure domain helpers, snapshots, validation, async flow
  entities/         data models, registries, codecs, provider/settings/storage entities
  features/         feature-owned UI and feature-specific elements
  interface/        definition/placement registry, SlotHost, context adapters
  infrastructure/   browser/server IO boundaries: API client and storage repositories
  processes/        generation runner, batch runner, lifecycle, storage sync
  providers/        client-side provider adapters
  shared/           reusable UI, i18n, image helpers, feature flags
  styles/           CSS entrypoint, tokens, shell/mobile layers
server/
  providers/        server-side provider adapters
  storage/          encrypted SQLite Storage v2
  index.ts          Express routes, proxy, static serving
docs/               architecture, migration, safety checks, API parameter notes
scripts/            architecture checks, screenshot runner, release checks
tests/              Node test runner unit tests
```

## Architecture

The project is organized around small owner modules rather than a central component bucket:

- `src/components` has been removed from active architecture.
- Shared primitives live in `src/shared/ui`.
- Feature-specific UI lives under the owning `src/features/<feature>` folder.
- Interface composition uses filesystem-discovered definitions and placements.
- Generation parameters are self-contained logical modules declared through `defineGenerationParam`.
- Provider behavior lives in provider adapters.
- Provider adapters own settings schemas, settings fields, and provider/model-specific parameter availability profiles.
- Task lifecycle, retry, cancellation, and delayed batch dispatch live in `src/processes/generation-task-lifecycle` and `src/processes/batch-runner`.
- Storage v2 separates task metadata, full assets, thumbnails, app document buckets, diagnostics, and audit tooling.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the current architecture map.

See [`docs/TELEGRAM_INTEGRATION.md`](docs/TELEGRAM_INTEGRATION.md) for setup and security notes for the Telegram bot/Mini App integration.

## Validation

Run static checks before changing or publishing the project:

```bash
npm run verify:static
```

This includes architecture boundaries, interface registry checks, generation parameter checks, provider adapter checks, task lifecycle checks, Storage v2 checks, CSS checks, motion/UI checks, debt budget checks, secret scanning, unit tests, and a production build.

Run the strict non-visual release gate before packaging a release archive:

```bash
npm run release:check
```

This adds strict debt-zero enforcement and strict storage audit on top of the static gate.

Run the visual smoke check when UI/layout changes are involved:

```bash
npm run verify:visual
```

It captures desktop/mobile screenshots for the main app surfaces and validates that the expected screenshot artifacts were produced. The visual review is intentionally manual: inspect the generated contact sheet/screenshots with your eyes rather than relying on pixel-diff noise.

Full local verification:

```bash
npm run verify:all
```

Release-readiness checklist:

```txt
docs/RELEASE_READINESS.md
```

Useful focused screenshot runs:

```bash
npm run capture:screenshots -- --viewports=desktop,mobile --scenarios=gallery,settings-api,settings-integrations --out=artifacts/desktop-checks
npm run capture:mobile
FULL_PAGE=1 npm run capture:screenshots
```

## Security note

Image Studio is a local personal tool, not a ready-to-host SaaS app.

Do not deploy it publicly as-is. Before exposing it to the internet, add server-side user authentication, production-grade secret management, request auditing without secrets, rate limiting, abuse controls, CSRF/origin hardening appropriate to your deployment, and a stricter provider/profile ownership model.

The default server host is `127.0.0.1` to reduce accidental exposure. Use `HOST=0.0.0.0` only when you intentionally want LAN access and understand the risks.

## Notes for GPT Image / OpenAI-compatible models

- Custom sizes use `WIDTHxHEIGHT`; for GPT Image 2 both sides should be divisible by 16.
- `background: "transparent"` may not be supported by every model/provider.
- `input_fidelity` is mainly useful for edit-capable models/providers that explicitly support it.
- `response_format` is kept for older DALL·E-compatible providers.

## License

MIT. See [LICENSE](LICENSE).
