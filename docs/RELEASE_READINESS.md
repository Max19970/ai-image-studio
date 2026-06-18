# Image Studio release readiness

Status: debt-zero baseline, 2026-06-18.

This document is the practical release checklist for the post debt-zero architecture.

## Release gates

### Required non-visual gate

```bash
npm run release:check
```

This runs:

```txt
npm run verify:static
npm run debt:check:strict
npm run storage:audit:strict
```

Expected result for this baseline:

```txt
architecture: 0 violations
interface registry: ok
generation params: ok
providers: ok
task lifecycle: ok
storage: ok
css: ok
motion: ok
ui: ok
debt:check: passed
debt:check:strict: passed
storage audit strict: ok
secrets: ok
tests: 42/42 passed
build: ok
```

### Required for visible UI changes

```bash
npm run verify:visual
```

Open the generated screenshots/contact sheet and review with eyes. The visual runner is not a pixel-diff tool.

Container note: if a single full visual run is interrupted by Chromium/Puppeteer frame-detach behavior, rerun the missing standard scenarios into the same `artifacts/verify-visual` directory and finish with `npm run visual:check`. This is an environment runner issue, not a pixel-diff failure.

### Optional full local gate

```bash
npm run verify:all
```

Use this when Chromium is available and the environment is not blocked by browser policy.

## Manual QA checklist

These require a real browser and, for provider flows, real credentials.

- [ ] Single image generation.
- [ ] Image edit with target attachment.
- [ ] Image edit with reference attachments.
- [ ] Image edit with mask attachment if supported.
- [ ] Batch generation.
- [ ] Batch interval between send starts.
- [ ] Retry after transient failure.
- [ ] Cancel unfinished mono request.
- [ ] Delete unfinished mono request.
- [ ] Cancel unfinished batch item.
- [ ] Delete unfinished batch task.
- [ ] Provider quick check.
- [ ] Provider full probe.
- [ ] Persistence after refresh.
- [ ] Persistence after server restart.
- [ ] Gallery thumbnail loading after refresh.
- [ ] Full image loading in detail view.
- [ ] Full image loading before download.
- [ ] Settings save/cancel behavior.
- [ ] Theme switch visual preview.
- [ ] Language switch.
- [ ] Sidebar collapsed state.
- [ ] Mobile scroll.
- [ ] Mobile composer.
- [ ] Mobile settings.
- [ ] Mobile detail view.
- [ ] Popover/dropdown placement near viewport edges.
- [ ] Keyboard Escape/focus behavior in modals/popovers/selects.

## Public repository checklist

- [ ] Keep `data/`, local SQLite files, `storage.key`, `.env`, and `artifacts/` out of the repository.
- [ ] Do not include generated private images or screenshots with secrets/private content.
- [ ] Run `npm run secrets:check` or `npm run release:check` before packaging.
- [ ] Confirm `LICENSE` is present and MIT.
- [ ] Confirm `.env.example` contains no real keys.
- [ ] Confirm README security note still says local-first and not public SaaS-ready.
- [ ] Confirm release notes describe architecture and known manual QA.

## Known non-blockers

These are intentionally not release blockers for the architecture baseline:

- Live provider QA without real credentials.
- Pixel-diff visual automation.
- A second real provider adapter.
- Backup/import UI implementation.
- Selected-task export UI.

They are product/future work, not hidden architecture debt.

## Ownership summary

- UI composition: definitions + placements.
- Feature UI/CSS: owning feature/section folders.
- Workspace state: domain hooks under `src/app/workspace/state`.
- Commands/context: domain factories under `src/app/commands` and `src/app/workspace/contexts`.
- Provider behavior: adapter packages.
- Provider parameter availability: provider `generationParams` profile.
- Generation parameter behavior: `defineGenerationParam` modules.
- Batch behavior: runner + reducer/progress modules.
- Storage: repository/codecs/assets/rows/stats/diagnostics modules.
- Verification: `release:check` plus visual/manual QA when relevant.
