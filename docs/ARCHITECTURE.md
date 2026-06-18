# Image Studio architecture

Status: debt-zero architecture baseline, 2026-06-18.

Image Studio is a local-first image generation studio. The architecture is organized around owner modules, explicit registries, provider adapters, process modules, and encrypted local persistence. The old migration target is complete: `src/components` is not an active layer, `App.tsx` is a composition root, and large global CSS/runtime buckets have been replaced with smaller owner-owned modules.

## Runtime overview

```txt
React client
  app composition + workspace hooks
  feature UI + SlotHost contributions
  provider-aware parameter/request adapters
  storage sync and task processes
        │
        ▼
Express local proxy
  provider adapter registry
  OpenAI-compatible server adapter
  encrypted SQLite Storage v2
        │
        ▼
OpenAI-compatible image provider
```

The client owns UI, workflow state, request preparation, and local orchestration. The server owns provider secrets/defaults, upstream proxying, capability probing, static serving, and encrypted local persistence.

## Client layers

```txt
src/app/
  Composition root, workspace state slices, command factories, context slices.

src/domain/
  Pure domain contracts and helpers: split generation/provider/settings/image-param types, request snapshots, status normalization, image file helpers, async flow.

src/entities/
  Data concepts and registries: provider settings, studio settings, image params, generation params, gallery archive types, storage codecs, provider probe cache.

src/features/
  Feature-owned UI and feature-specific elements: composer, batch composer, gallery, detail, settings, parameters, workspace, image actions.

src/interface/
  Definition/placement registry, SlotHost, split workspace context contracts, context adapters, capability and provider-parameter filters.

src/infrastructure/
  Browser/server IO repositories: API transport, encrypted-storage repositories, local-storage fallbacks.

src/processes/
  Workflows: generation runner, batch runner, task lifecycle/scheduler, storage sync.

src/providers/
  Client-side provider adapters and provider-specific request/response/parameter profiles.

src/shared/
  Reusable primitives only: UI controls, i18n, image helpers, feature flags.

src/styles/
  CSS entrypoint, tokens, shell/mobile/motion layers. Feature/shared styles live next to owner modules.
```

Reusable UI belongs in `src/shared/ui`. Feature-specific UI belongs under the owning `src/features/<feature>` folder. Do not recreate `src/components` as a catch-all layer.

## Server layers

```txt
server/index.ts
  Thin bootstrap: create the app, register static client fallback, listen.

server/app.ts
  Express app factory: shared middleware and API route registration.

server/http/
  HTTP-only helpers: CORS policy, upstream proxy response streaming, error responses, static client fallback.

server/routes/
  Domain route registrars: generation proxy, provider probe/check, generation-task storage, app-document storage, defaults.

server/providers/
  Server-side provider contract, registry, settings schemas, concrete provider packages.

server/storage/
  SQLite schema, migrations, encrypted/compressed document store, app buckets, generation task repository.
```

Provider-specific request construction, upstream fetch/retry, multipart edit construction, response/error handling, settings validation, and probe logic stay inside provider packages.

## Workspace composition

The workspace is split by state/command/context ownership:

```txt
src/app/workspace/state/
  useComposerWorkspaceState
  useSettingsWorkspaceState
  useNavigationWorkspaceState
  useTaskSelectionState
  useProviderProbeState
  useBatchWorkspaceState
  useGenerationExecutionState
  usePersistentWorkspaceSettings

src/app/commands/
  createWorkspaceCommands
  createComposerCommands
  createGalleryCommands
  createBatchComposerCommands
  createSettingsCommands
  createDetailCommands
  createParameterCommands

src/app/workspace/contexts/
  createSidebarContext
  createMainContext
  createDockContext
  createModalsContext
```

`useWorkspaceState`, `createAppCommands`, and `createWorkspaceContexts` are composition files, not places for feature logic.

## Definition/Placement UI composition

Runtime UI composition uses filesystem-discovered definitions and placements:

```txt
Definition = what the element is and how it behaves.
Placement  = where, when, and with which props/context adapter it appears.
```

Typical structure:

```txt
src/features/<feature>/elements/<element>/definition.ts
src/interface/placements/<surface>.placement.ts
```

`src/interface/registry.ts` resolves definitions + placements and `SlotHost` renders contributions. Existing elements are moved by changing placement config, not by copying UI files.

Check:

```bash
npm run interface:check
```

## Generation parameters

Generation parameters are self-contained logical modules:

```txt
src/entities/generation-params/fields/<param>/
  param.ts        logical behavior, ownership metadata, state keys, snapshots, payload serialization
  definition.ts  UI field contribution
```

Each parameter is declared through `defineGenerationParam` and owns:

- state keys;
- UI field definition id;
- placement ids;
- i18n namespace;
- payload keys/serializers when applicable;
- snapshot capture/restore/sanitize behavior;
- normalization/copy behavior when applicable.

Provider adapters expose a `generationParams` profile. The profile can expose all logical params, a custom subset, mode-specific subsets, model-specific rules, and rare code-level availability. This provider/model availability is applied consistently to parameter UI, payload serialization, and request snapshot capture.

Checks/docs:

```bash
npm run params:check
```

- `docs/API_PARAMETERS.md`
- `docs/GENERATION_PARAM_PLUGIN_CONTRACT.md`

## Provider adapters

Provider-specific behavior belongs in provider adapters, not in the app shell, settings page, or transport layer.

Client adapter contract:

```txt
src/providers/<adapter-id>/
  definition.ts       id, label, settingsFields, generationParams, request/response adapters
  requestAdapter.ts   provider payload construction
  responseAdapter.ts  provider response parsing
```

Server adapter contract:

```txt
server/providers/<adapter-id>/
  adapter.ts          composition entry
  settingsSchema.ts   adapter-owned Zod settings schema
  requestHandlers.ts  generate/edit handlers
  probeSuite.ts       capability probing
  probeClassifier.ts  probe status classification when needed
```

Checks/docs:

```bash
npm run providers:check
```

- `docs/PROVIDER_ADAPTER_CONTRACT.md`

## Task lifecycle and batch runner

Generation task lifecycle is explicit:

```txt
created -> queued -> sending -> running -> succeeded
                           -> retrying -> running
                           -> failed
                           -> cancelled
```

Shared lifecycle modules live in:

```txt
src/processes/generation-task-lifecycle/
  status.ts
  transitions.ts
  cancellationRegistry.ts
  scheduler.ts
  retryPolicy.ts
```

Batch generation uses a runner plus reducer/progress modules:

```txt
src/processes/batch-runner/
  batchRunner.ts
  batchTaskModel.ts
  batchTaskReducer.ts
  batchRunProgress.ts
```

The batch scheduler preserves delayed parallel dispatch: the interval is measured between send starts, not after request completion.

Checks/docs:

```bash
npm run tasks:check
```

- `docs/ARCHITECTURE_TASK_LIFECYCLE.md`
- `docs/BATCH_PROCESS_TRANSITIONS.md`

## Storage v2 and gallery archive

Storage v2 separates task metadata, task documents, full image assets, thumbnail assets, and app document buckets.

```txt
storage_migrations
storage_documents
encrypted_blobs                 legacy fallback
generation_tasks
generation_task_assets

buckets:
  generation-task.v2
  generation-task-asset.v2
  studio-settings.v2
  image-params.v2
  provider-probe-cache.v2
```

Generation history supports lazy asset modes:

```txt
/api/storage/generation-tasks?assetMode=full
/api/storage/generation-tasks?assetMode=thumbnail
/api/storage/generation-tasks?assetMode=metadata
/api/storage/generation-task-asset?key=<storageAssetKey>
```

The gallery loads thumbnail history by default, renders a bounded first page, and exposes archive search/filter/sort/cleanup. Detail/download surfaces hydrate full assets only when needed.

Checks/docs:

```bash
npm run storage:check
npm run storage:audit
npm run storage:audit:strict
npm run storage:benchmark
```

- `docs/ARCHITECTURE_STORAGE_V2.md`
- `docs/STORAGE_TOOLING_AND_BACKUP_DESIGN.md`
- `docs/GALLERY_ARCHIVE_UX_AUDIT.md`

## Settings/API screen

Generation API settings are split into provider/model lists, editors, adapter selector, custom headers editor, provider checks, draft selection helpers, and owned CSS modules.

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

See:

- `docs/ARCHITECTURE_SETTINGS_API.md`
- `docs/SETTINGS_API_UX_AUDIT.md`

## CSS, motion, and UI primitives

Global CSS layers are intentionally small:

```txt
src/styles/global.css          import-only entrypoint
src/styles/layers/base.css     Tailwind/base/tokens
src/styles/layers/app-shell.css
src/styles/layers/app-primitives.css
src/styles/layers/mobile.css
src/styles/layers/motion.css
```

Feature CSS lives next to the owning feature/section. Motion checks prevent layout/filter-heavy transitions from returning. UI checks protect popover focus, keyboard navigation, icon labels, ARIA hooks, and touch targets.

Checks/docs:

```bash
npm run css:check
npm run motion:check
npm run ui:check
```

- `docs/MOTION_PERFORMANCE_AUDIT.md`
- `docs/UI_ACCESSIBILITY_AUDIT.md`

## Verification and release gates

Static gate:

```bash
npm run verify:static
```

Strict release gate:

```bash
npm run release:check
```

Visual smoke gate:

```bash
npm run verify:visual
```

Full local gate:

```bash
npm run verify:all
```

Release readiness docs:

- `docs/ARCHITECTURE_TESTING.md`
- `docs/RELEASE_READINESS.md`
- `docs/TECH_DEBT_ZERO_PLAN.md`
