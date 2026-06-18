# Image Studio testing and verification

Status: current release safety net, 2026-06-18.

The project uses layered checks instead of one giant test suite. Pure logic is covered by unit tests; architecture rules are enforced by scripts; visual layout is checked with repeatable screenshots and human review.

## Unit tests

```bash
npm test
```

Runs Node's built-in test runner through `tsx` against `tests/**/*.test.ts`.

Current coverage includes:

- OpenAI-compatible request payload serialization and raw JSON override ordering;
- OpenAI-compatible response JSON/SSE parsing;
- provider adapter contracts, settings schemas, error normalization, probe classification, quick-check failure normalization;
- provider-owned generation parameter availability profiles;
- generation parameter registry/plugin ownership, normalization, snapshot capture/sanitize, restore/include flags, i18n ownership;
- task lifecycle status normalization, cancellation registry, delayed-parallel schedule calculation, retry policy;
- batch reducer/progress behavior around streaming, final images, partial failures, and cancellation;
- Storage v2 full assets, thumbnails, metadata/thumbnail/full lazy modes, single asset fetch, encrypted app buckets;
- storage diagnostics/audit edge cases;
- settings draft selection behavior;
- gallery archive search/filter/sort/paging;
- RU/EN translation key parity, locale normalization, fallback, and interpolation.

## Static verification

```bash
npm run verify:static
```

Runs:

```txt
arch:check:strict
imports:check
interface:check
params:check
providers:check
tasks:check
storage:check
css:check
motion:check
ui:check
debt:check
secrets:check
test
build
```

Use this before packaging or broad changes.

## Strict release verification

```bash
npm run release:check
```

Runs static verification, import-cycle detection, strict debt, and storage integrity gates:

```txt
verify:static
debt:check:strict
storage:audit:strict
```

This is the default non-visual release gate.

## Visual verification

```bash
npm run verify:visual
```

Runs the screenshot runner on the standard desktop/mobile smoke surface and validates every expected screenshot artifact:

```txt
gallery
sidebar-collapsed
settings-api
settings-models
detail
batch-composer
info
parameters
```

The screenshot artifact check is intentionally not pixel diff. It catches missing/empty/corrupt captures and gives a stable output directory for human visual review:

```txt
artifacts/verify-visual
```

If container Chromium policy blocks localhost with `URLBlocklist: ["*"]`, use the project screenshot guide: temporarily remove only that policy key, run capture, then restore the policy file. If a full visual run is interrupted by transient Chromium/Puppeteer frame-detach behavior, rerun the missing standard scenarios into the same output directory and finish with `npm run visual:check`.

## Full local verification

```bash
npm run verify:all
```

Runs `verify:static` and `verify:visual`. Use it before release archives when Chromium is available.

## Storage tooling

```bash
npm run storage:benchmark
npm run storage:audit
npm run storage:audit:strict
```

`storage:benchmark` uses a temporary SQLite database by default and does not touch the current user DB unless explicitly asked with `--use-current-db`.

## Test file map

```txt
tests/provider-openai-compatible.test.ts
tests/provider-adapter-contract.test.ts
tests/generation-params.test.ts
tests/generation-param-plugin-contract.test.ts
tests/task-lifecycle.test.ts
tests/batch-runner.test.ts
tests/storage-v2.test.ts
tests/storage-generation-task-codecs.test.ts
tests/storage-diagnostics.test.ts
tests/settings-draft-selection.test.ts
tests/gallery-archive.test.ts
tests/i18n-parity.test.ts
```

## Rules for future tests

- Prefer pure unit tests for domain/entities/processes/providers.
- Test provider request/response adapters without real network requests.
- Storage tests must use a temporary SQLite database path and test storage key.
- Visual tests should use stable `data-testid` / data attributes, not CSS module class names.
- Do not put API keys, provider secrets, local DB files, generated private images, or private screenshots into fixtures.

## Known limitations

- Visual verification is a screenshot smoke gate plus human review, not automated perceptual diffing.
- Live provider behavior cannot be fully verified without real credentials and should stay manual or opt-in local-only.
- Performance feel should still be checked in a real browser/device for major UI/motion work.
