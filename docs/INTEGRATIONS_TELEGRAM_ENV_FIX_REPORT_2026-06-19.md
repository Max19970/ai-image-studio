# Stage 09 — Telegram tunnel env/runtime fix

Date: 2026-06-19
Scope: startup/environment loading, production CORS defaults, Vite host allowlist, and Telegram Mini App early ready handling.

## Problem

Running Image Studio behind Cloudflare Tunnel exposed three deployment issues:

- `npm run start` launched `tsx server/index.ts`, so `.env` was not loaded before server modules read `process.env`.
- CORS middleware was mounted globally and could block production static assets when the browser sent an `Origin` header for `http://127.0.0.1:8787` or the public tunnel host.
- Telegram Mini App could keep its native loading placeholder if `Telegram.WebApp.ready()` was reached only after the React runtime finished booting.

## Changes

- Added `server/env/loadEnv.ts`, a dependency-free `.env` loader.
- Added `server/start.ts`, which loads environment files before importing the server entrypoint.
- Changed `npm run start` and `npm run dev:server` to use `server/start.ts`.
- Added local production origins to CORS defaults:
  - `http://127.0.0.1:${PORT}`
  - `http://localhost:${PORT}`
- Added `IMAGE_STUDIO_PUBLIC_URL` support for CORS origin derivation.
- Moved CORS middleware from global Express scope to `/api/**`, so production static assets are not blocked by API CORS checks.
- Added Vite `server.allowedHosts` / `preview.allowedHosts` derivation from:
  - `IMAGE_STUDIO_ALLOWED_HOSTS`
  - `IMAGE_STUDIO_PUBLIC_URL`
  - `IMAGE_STUDIO_ALLOWED_ORIGINS`
- Added early Telegram bridge loading/readiness script in `index.html` for real Mini App WebViews.
- Updated `.env.example`, `README.md`, and `docs/TELEGRAM_INTEGRATION.md`.
- Added focused tests for env loading and CORS production defaults.

## Recommended Cloudflare Tunnel `.env`

```env
HOST=127.0.0.1
PORT=8787
IMAGE_STUDIO_PUBLIC_URL=https://comfybottg.space
IMAGE_STUDIO_ALLOWED_HOSTS=comfybottg.space
IMAGE_STUDIO_ALLOWED_ORIGINS=http://127.0.0.1:8787,http://localhost:8787,https://comfybottg.space
```

## Verification

- `npm run verify:static` — passed.
- `npm test` — 120/120 passed as part of `verify:static`.
- `npm run build` — passed as part of `verify:static`.
- Smoke test with temporary `.env`, `npm run start`, and direct asset fetch:
  - `/` returned production HTML.
  - `/assets/index-*.js` returned JavaScript.
  - startup log confirmed `.env` was loaded.

## Notes

The pre-existing ComfyUI debt warning remains unchanged:

```txt
src/entities/generation-params/comfyui/ComfyUiGenerationSurface.tsx: 305 lines (limit 300)
```

## Packaging patch

A follow-up packaging pass restored the required static data directory that was missing from the first Stage 09 archive:

- `src/data/studio.defaults.json`
- `src/data/interface-themes.json`

Without these files, `tsc --noEmit` failed on imports from `src/domain/defaults.ts` and `src/features/settings/themePreview.ts`.

Re-verification after restoring the files:

- `npm run build` — passed.
- `npm test` — 120/120 passed.
- `npm run secrets:check` — passed.
