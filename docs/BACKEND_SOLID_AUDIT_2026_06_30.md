# Backend SOLID / Extensibility Audit - 2026-06-30

Scope: backend code under `server/**`, plus `src/**` modules that the backend imports or is structurally coupled to. I did not audit visual UI quality here.

Interpretation used in this audit:

- OCP violation: adding a new provider, integration, workflow plugin, resource kind, route group, task kind, storage document type, runtime action, transport, or event channel requires editing at least one existing source file.
- Dynamic discovery violation: a registry exists but is populated by static imports/arrays, or a caller branches on concrete ids instead of asking a discovered module for behavior.
- DIP violation: a domain/runtime module directly imports concrete infrastructure, concrete adapters, global process/env/fs/crypto/fetch/SQLite, or frontend-side modules instead of receiving a port/interface.
- SRP violation: one module owns multiple reasons to change, for example parsing HTTP, use-case orchestration, persistence, serialization, and response formatting.
- ISP violation: a common interface forces every adapter to implement capabilities it may not support.
- LSP violation: a subtype/adapter can be substituted only because callers know its id or because unknown ids silently fall back to another adapter.

## Executive Summary

The backend is partially modular, but the current module system is not dynamically extensible. It has several registries and manifests, yet most of them are populated by editing central files. The strict requirement "add new behavior without editing existing code" is currently violated for providers, integrations, routes, ComfyUI workflow plugins, resource kinds, OpenAI-compatible probe fields, storage document buckets, runtime task behavior, and architecture tooling.

The largest SOLID debt clusters are:

- Provider layer: static provider registries, hard-coded adapter ids in runtime, fat adapter interface, client-side response adapters imported into server runtime.
- Integration layer: static Telegram-only definition/runtime registration and Telegram-specific routes.
- Runtime/task layer: singleton mutable runtime state, cancellation maps, SSE client registry, direct persistence coupling.
- Storage layer: global SQLite/encryption singleton, static buckets/routes, repository modules that mix persistence, migration compatibility, codecs, asset policy, and stats.
- Route layer: route functions parse requests, call runtime/storage, enforce business rules, and format responses directly.
- Tooling: phrase-based checks enforce current file shapes instead of true plugin discovery contracts.

## Findings

### B-SOLID-001 - Provider registry is static, not discovery-based

Principles: OCP, DIP, dynamic discovery.

Files:

- `server/providers/registry.ts:1`
- `server/providers/registry.ts:2`
- `server/providers/registry.ts:6`
- `server/providers/registry.ts:7`
- `server/providers/registry.ts:8`
- `src/entities/provider/registry.ts:1`
- `src/entities/provider/registry.ts:2`
- `src/entities/provider/registry.ts:10`

Problem: server and client provider registries import `openai-compatible` and `comfyui` manifests directly, then build arrays by hand. Adding a third provider requires editing the existing registry files. This is a direct violation of the user's strict extensibility requirement.

Refactor target: providers should be discovered from a plugin/module directory or manifest export convention. The composition root should load discovered manifests and validate them, not enumerate concrete providers.

### B-SOLID-002 - Unknown provider id silently falls back to OpenAI-compatible

Principles: LSP, OCP, correctness.

Files:

- `server/providers/registry.ts:16`
- `server/providers/registry.ts:17`
- `server/providers/registry.ts:19`
- `server/providers/registry.ts:20`
- `server/providers/types.ts:4`
- `src/entities/studio-settings/index.ts:27`
- `src/entities/studio-settings/index.ts:122`
- `src/entities/generation-params/providerState.ts:10`

Problem: provider id absence or unknown ids default to `openai-compatible`. That makes adapter substitution unsafe: an invalid/new provider can execute through the wrong adapter instead of failing explicitly or being resolved by discovery metadata.

Refactor target: unknown ids should be rejected by a registry boundary. Defaults should live in a configurable bootstrapping policy, not in low-level provider parsing and state helpers.

### B-SOLID-003 - Server generation pipeline branches on concrete adapter ids

Principles: OCP, DIP, LSP, dynamic discovery.

Files:

- `server/processes/generation-task-runtime/providerPipeline.ts:5`
- `server/processes/generation-task-runtime/providerPipeline.ts:9`
- `server/processes/generation-task-runtime/providerPipeline.ts:39`
- `server/processes/generation-task-runtime/providerPipeline.ts:40`
- `server/processes/generation-task-runtime/providerPipeline.ts:43`
- `server/processes/generation-task-runtime/providerPipeline.ts:44`
- `server/processes/generation-task-runtime/providerPipeline.ts:47`
- `server/processes/generation-task-runtime/providerPipeline.ts:48`
- `server/processes/generation-task-runtime/providerPipeline.ts:163`
- `server/processes/generation-task-runtime/providerPipeline.ts:182`
- `server/processes/generation-task-runtime/providerPipeline.ts:192`

Problem: runtime selects response parsing, raw compaction, and streaming behavior by checking `adapterId === 'comfyui'`. Adding a provider with its own stream format or raw compaction requires editing this existing pipeline.

Refactor target: `ProviderAdapterDefinition` should expose a server-owned response adapter/stream strategy/raw persistence policy. The pipeline should call adapter capabilities, not inspect adapter ids.

### B-SOLID-004 - Backend imports frontend/client provider adapters and shared process modules

Principles: DIP, architecture boundary, SRP.

Files:

- `server/processes/generation-task-runtime/providerPipeline.ts:3`
- `server/processes/generation-task-runtime/providerPipeline.ts:4`
- `server/processes/generation-task-runtime/providerPipeline.ts:5`
- `server/processes/generation-task-runtime/providerPipeline.ts:9`
- `server/processes/generation-task-runtime/batchRun.ts:3`
- `server/processes/generation-task-runtime/batchRun.ts:4`
- `server/processes/generation-task-runtime/runtimeStore.ts:2`
- `server/processes/generation-task-runtime/cancellation.ts:1`
- `server/storage/galleryMetadataStore.ts:11`

Problem: server runtime depends on `src/providers`, `src/entities`, and `src/processes` modules that are part of the client/domain application tree. Some imports are pure enough today, but the dependency direction is not protected. Backend deploy/test boundaries now depend on frontend-side module structure.

Refactor target: move shared pure contracts into a neutral package/layer, and keep server runtime depending only on server-side ports or true shared domain modules.

### B-SOLID-005 - Provider adapter interface is too fat

Principles: ISP, LSP, OCP.

Files:

- `server/providers/types.ts:120`
- `server/providers/types.ts:125`
- `server/providers/types.ts:126`
- `server/providers/types.ts:127`
- `server/providers/types.ts:128`
- `server/providers/types.ts:129`
- `server/providers/types.ts:131`
- `server/providers/types.ts:132`
- `server/providers/types.ts:133`
- `server/providers/comfyui/adapter.ts:23`
- `server/providers/comfyui/requestHandlers.ts:157`
- `server/providers/comfyui/requestHandlers.ts:162`

Problem: every provider must expose generate, edit, provider-mode submit, quick-check, probe, settings schema, resources, endpoint resolution, and fingerprint in one interface. ComfyUI declares `supportsEdit: false`, but still implements `fetchEdit` only to throw.

Refactor target: split provider contracts into smaller ports: submitter, edit submitter, resource provider, probe provider, settings parser, response adapter, and diagnostics. A provider should implement only the ports it supports.

### B-SOLID-006 - Shared `ProviderSchema` is OpenAI-shaped

Principles: OCP, DIP.

Files:

- `server/providers/types.ts:3`
- `server/providers/types.ts:4`
- `server/providers/types.ts:5`
- `server/providers/types.ts:6`
- `server/providers/types.ts:8`
- `server/providers/types.ts:9`
- `server/providers/types.ts:12`
- `server/providers/types.ts:13`
- `server/providers/openai-compatible/settingsSchema.ts:4`
- `server/providers/comfyui/settingsSchema.ts:4`
- `src/domain/providerSettings.ts:2`
- `src/domain/providerSettings.ts:3`
- `src/domain/providerSettings.ts:4`
- `src/domain/providerSettings.ts:6`
- `src/domain/providerSettings.ts:7`
- `src/domain/providerSettings.ts:10`
- `src/domain/providerSettings.ts:11`

Problem: the common provider settings type contains endpoint/api-key/model/header fields that fit OpenAI-compatible HTTP APIs and are then stretched to ComfyUI. A future provider with different auth/session/project/workspace settings must either overload these fields or edit shared settings types.

Refactor target: keep only universal provider identity in the shared type. Adapter-specific config should be adapter-owned and stored/validated through typed extension data.

### B-SOLID-007 - Provider submit operation modes are manually enumerated

Principles: OCP, dynamic discovery.

Files:

- `server/providers/openai-compatible/submitOperation.ts:3`
- `server/providers/openai-compatible/submitOperation.ts:8`
- `server/providers/openai-compatible/submitOperation.ts:13`
- `server/providers/openai-compatible/submitOperation.ts:15`
- `server/providers/openai-compatible/submitOperation.ts:16`
- `server/providers/comfyui/requestHandlers.ts:28`
- `server/providers/comfyui/requestHandlers.ts:33`
- `server/providers/comfyui/requestHandlers.ts:165`
- `server/providers/comfyui/requestHandlers.ts:167`
- `server/providers/comfyui/requestHandlers.ts:168`

Problem: mode ids are hard-coded in Set literals. Adding a mode requires editing old adapter files instead of contributing a new mode descriptor.

Refactor target: provider modes should be manifest/discovery entries with submit handlers or operation resolvers registered by id.

### B-SOLID-008 - OpenAI-compatible probe matrix is hard-coded

Principles: OCP, SRP.

Files:

- `server/providers/openai-compatible/probeSuite.ts:114`
- `server/providers/openai-compatible/probeSuite.ts:120`
- `server/providers/openai-compatible/probeSuite.ts:128`
- `server/providers/openai-compatible/probeSuite.ts:155`
- `server/providers/openai-compatible/probeSuite.ts:171`
- `server/providers/openai-compatible/probeSuite.ts:188`
- `server/providers/openai-compatible/probeSuite.ts:192`

Problem: the supported parameter probe list is embedded in one backend file. Adding a new generation parameter or provider-specific parameter requires editing this probe suite. This duplicates knowledge that should come from parameter/profile manifests.

Refactor target: probe cases should be generated from parameter descriptors, capability definitions, and provider mode metadata.

### B-SOLID-009 - ComfyUI workflow plugin system is statically wired

Principles: OCP, dynamic discovery, SRP.

Files:

- `server/providers/comfyui/workflowTypes.ts:11`
- `server/providers/comfyui/workflowTypes.ts:99`
- `server/providers/comfyui/workflowTypes.ts:130`
- `server/providers/comfyui/workflowConfig.ts:80`
- `server/providers/comfyui/workflowConfig.ts:82`
- `server/providers/comfyui/workflowConfig.ts:90`
- `server/providers/comfyui/workflowConfig.ts:101`
- `server/providers/comfyui/workflowConfig.ts:103`
- `server/providers/comfyui/workflowConfig.ts:104`
- `server/providers/comfyui/workflowConfig.ts:105`
- `server/providers/comfyui/workflowConfig.ts:106`
- `server/providers/comfyui/workflowConfig.ts:110`
- `server/providers/comfyui/workflowExtensions.ts:105`
- `server/providers/comfyui/workflowPluginValidation.ts:5`

Problem: plugin kinds, plugin config shape, defaults, validation rules, and workflow extension registration are all centralized. Adding a ComfyUI workflow plugin requires editing type unions, config normalization, ordering, validation, and the extension map.

Refactor target: workflow plugins should be self-describing modules with `id`, input schema, default resolver, compatibility rules, order, and graph mutation hooks. The ComfyUI adapter should discover and compose these modules.

### B-SOLID-010 - ComfyUI sampler/resource behavior uses explicit branches

Principles: OCP, SRP.

Files:

- `server/providers/comfyui/workflowSamplerNodes.ts:10`
- `server/providers/comfyui/workflowSamplerNodes.ts:44`
- `server/providers/comfyui/resources.ts:65`
- `server/providers/comfyui/resources.ts:82`
- `server/providers/comfyui/resources.ts:99`
- `server/providers/comfyui/resources.ts:104`
- `server/providers/comfyui/resources.ts:121`
- `server/providers/comfyui/resources.ts:124`
- `server/providers/comfyui/resources.ts:125`
- `server/providers/comfyui/resources.ts:126`
- `server/providers/comfyui/resources.ts:127`
- `server/providers/comfyui/resources.ts:128`
- `server/providers/comfyui/resources.ts:140`

Problem: sampler node construction and resource fetching are hard-coded switch/if chains. New resource kinds or sampler backends require modifying existing files.

Refactor target: sampler backends and resource kinds should be registered descriptors. Each descriptor should own fetch/build logic and metadata.

### B-SOLID-011 - ComfyUI request/history logic is duplicated and partially dead

Principles: SRP, DRY, maintainability.

Files:

- `server/providers/comfyui/requestHandlers.ts:37`
- `server/providers/comfyui/requestHandlers.ts:65`
- `server/providers/comfyui/requestHandlers.ts:87`
- `server/providers/comfyui/requestHandlers.ts:104`
- `server/providers/comfyui/requestHandlers.ts:120`
- `server/providers/comfyui/progressStream.ts:55`
- `server/providers/comfyui/progressStream.ts:79`
- `server/providers/comfyui/progressStream.ts:359`
- `server/providers/comfyui/progressStream.ts:375`

Problem: `hasNodeErrors`, polling/sleep/history waiting, and prompt submission/error handling exist in both request handlers and stream handling. `runComfyUiWorkflow` appears unused by the live generation path, which uses `runComfyUiWorkflowStream`.

Refactor target: extract a ComfyUI prompt execution port/service that owns submit, cancellation registration, history polling, and validation once. Streaming and non-streaming output adapters should consume that service.

### B-SOLID-012 - Route registration is static and centralized

Principles: OCP, dynamic discovery.

Files:

- `server/app.ts:4`
- `server/app.ts:15`
- `server/routes/index.ts:4`
- `server/routes/index.ts:5`
- `server/routes/index.ts:7`
- `server/routes/index.ts:8`
- `server/routes/index.ts:9`
- `server/routes/index.ts:11`
- `server/routes/index.ts:12`
- `server/routes/index.ts:13`
- `server/routes/index.ts:16`
- `server/routes/index.ts:17`
- `server/routes/index.ts:18`

Problem: adding a route group requires editing `server/routes/index.ts`. Provider/integration modules cannot contribute routes by manifest.

Refactor target: route groups should be discovered/registered from module descriptors. App creation should receive a route registry or plugin container.

### B-SOLID-013 - `createImageStudioApp` mutates global integration registry

Principles: SRP, DIP, testability.

Files:

- `server/app.ts:5`
- `server/app.ts:7`
- `server/app.ts:9`
- `server/app.ts:14`
- `server/integrations/registry.ts:3`
- `server/integrations/registry.ts:5`

Problem: app factory both configures Express/multer and registers built-in runtime integrations into a module-level registry. Constructing an app has global side effects.

Refactor target: build an app context first, discover integrations into that context, then create routes from the context. Avoid module-level mutable registries as app creation side effects.

### B-SOLID-014 - Generation task routes erase type safety with dynamic string keys

Principles: DIP, LSP, maintainability.

Files:

- `server/routes/generation/taskRoutes.ts:7`
- `server/routes/generation/taskRoutes.ts:9`
- `server/routes/generation/taskRoutes.ts:26`
- `server/routes/generation/taskRoutes.ts:34`
- `server/routes/generation/taskRoutes.ts:43`
- `server/routes/generation/taskRoutes.ts:52`
- `server/routes/generation/taskRoutes.ts:62`
- `server/routes/generation/taskRoutes.ts:71`
- `server/routes/generation/taskRoutes.ts:80`
- `server/routes/generation/taskRoutes.ts:89`
- `server/routes/generation/taskRoutes.ts:98`

Problem: routes access runtime functions through string-concatenated keys and cast the module to `Record<string, (...args: any[]) => any>`. This bypasses TypeScript contracts and static refactoring tools.

Refactor target: inject a typed `GenerationTaskRuntimePort` into route registration.

### B-SOLID-015 - Request parsing contains provider-specific protocol knowledge

Principles: OCP, SRP.

Files:

- `server/routes/generation/requestParsing.ts:11`
- `server/routes/generation/requestParsing.ts:21`
- `server/routes/generation/requestParsing.ts:45`
- `server/routes/generation/requestParsing.ts:68`
- `server/routes/generation/requestParsing.ts:86`
- `server/routes/generation/requestParsing.ts:93`
- `server/routes/generation/requestParsing.ts:100`
- `server/routes/generation/requestParsing.ts:112`
- `server/routes/generation/providerSubmitRoutes.ts:19`
- `server/routes/generation/providerSubmitRoutes.ts:20`
- `server/routes/generation/providerSubmitRoutes.ts:23`
- `server/routes/generation/providerSubmitRoutes.ts:31`
- `server/routes/generation/providerSubmitRoutes.ts:32`

Problem: generic request parsing knows the ComfyUI-specific header `x-image-studio-comfyui-preview-stream`. New providers needing request-specific transport flags require editing this shared parser.

Refactor target: parse generic multipart/json envelope in routes, then let the selected provider adapter parse adapter-specific transport context.

### B-SOLID-016 - Routes mix HTTP concerns, use cases, storage, runtime mutation, and response shaping

Principles: SRP, DIP.

Files:

- `server/routes/providerRoutes.ts:6`
- `server/routes/providerRoutes.ts:8`
- `server/routes/providerRoutes.ts:9`
- `server/routes/providerRoutes.ts:23`
- `server/routes/providerRoutes.ts:26`
- `server/routes/providerRoutes.ts:33`
- `server/routes/galleryFolderRoutes.ts:53`
- `server/routes/galleryFolderRoutes.ts:82`
- `server/routes/galleryFolderRoutes.ts:92`
- `server/routes/galleryFolderRoutes.ts:105`
- `server/routes/galleryFolderRoutes.ts:107`
- `server/routes/galleryFolderRoutes.ts:122`
- `server/routes/galleryFolderRoutes.ts:127`
- `server/routes/galleryFolderRoutes.ts:139`
- `server/routes/galleryFolderRoutes.ts:150`
- `server/routes/generationTaskHistoryRoutes.ts:11`
- `server/routes/generationTaskHistoryRoutes.ts:20`
- `server/routes/generationTaskHistoryRoutes.ts:26`
- `server/routes/generationTaskHistoryRoutes.ts:36`
- `server/routes/generationTaskHistoryRoutes.ts:45`

Problem: route modules contain parsing, authorization/validation-ish checks, use-case branching, storage calls, runtime mutation, and response formatting. New behavior tends to grow route files instead of adding use-case modules.

Refactor target: thin routes should call injected application services/use cases with validated DTOs. Storage/runtime dependencies should be behind ports.

### B-SOLID-017 - Integration definitions are static and Telegram-only

Principles: OCP, dynamic discovery.

Files:

- `src/domain/integrations.ts:102`
- `src/domain/integrations.ts:160`
- `src/domain/integrations.ts:161`
- `src/domain/integrations.ts:166`
- `server/integrations/builtins.ts:2`
- `server/integrations/builtins.ts:4`
- `server/integrations/builtins.ts:5`
- `server/integrations/builtins.ts:6`

Problem: integration metadata is centralized in `src/domain/integrations.ts`; runtime registration imports Telegram directly. Adding Slack/Discord/webhook/etc. requires editing existing definition and builtins files.

Refactor target: integration modules should ship both definition and runtime adapter manifests. The registry should discover manifests instead of importing Telegram.

### B-SOLID-018 - Telegram Mini App has a dedicated route instead of integration-owned route contribution

Principles: OCP, SRP.

Files:

- `server/routes/index.ts:9`
- `server/routes/index.ts:17`
- `server/routes/telegramMiniAppRoutes.ts:3`
- `server/routes/telegramMiniAppRoutes.ts:14`
- `server/routes/telegramMiniAppRoutes.ts:18`
- `server/routes/telegramMiniAppRoutes.ts:20`

Problem: Telegram-specific Mini App validation is mounted from the central route index. Any integration with custom auth routes requires editing the global route composition.

Refactor target: integrations should optionally contribute routes through their manifest/runtime module.

### B-SOLID-019 - Integration runtime action dispatch is string-based and closed

Principles: OCP, ISP.

Files:

- `server/integrations/telegram/adapter.ts:6`
- `server/integrations/telegram/adapter.ts:19`
- `server/integrations/telegram/adapter.ts:20`
- `server/integrations/telegram/adapter.ts:21`
- `server/integrations/telegram/adapter.ts:22`
- `server/routes/integrationRoutes.ts:55`
- `server/routes/integrationRoutes.ts:65`
- `server/routes/integrationRoutes.ts:75`
- `server/routes/integrationRoutes.ts:122`

Problem: adapter actions are an `if` chain, while route layer also special-cases `start-runtime` and `stop-runtime`. Adding an action requires editing the adapter dispatch function and possibly route behavior.

Refactor target: action descriptors should be registered in a map with handlers, required secrets/runtime metadata, payload schema, and redaction policy.

### B-SOLID-020 - Integration launch modes are declared extensible but runtime rejects extension

Principles: LSP, OCP.

Files:

- `server/integrations/telegram/types.ts:3`
- `server/integrations/telegram/types.ts:72`
- `server/integrations/telegram/types.ts:77`
- `server/integrations/telegram/runtime.ts:63`
- `server/integrations/telegram/runtime.ts:72`

Problem: `TelegramLaunchMode` includes `webhook`, but `resolveTelegramRuntimeConfig` rejects anything except polling. Adding webhook support requires editing existing Telegram types/config/runtime rather than adding a launch-mode strategy.

Refactor target: model launch modes as strategies discovered by id.

### B-SOLID-021 - Encrypted storage is a global concrete SQLite/encryption singleton

Principles: DIP, SRP, testability.

Files:

- `server/storage/encryptedStore.ts:14`
- `server/storage/encryptedStore.ts:17`
- `server/storage/encryptedStore.ts:20`
- `server/storage/encryptedStore.ts:21`
- `server/storage/encryptedStore.ts:43`
- `server/storage/encryptedStore.ts:44`
- `server/storage/encryptedStore.ts:50`
- `server/storage/encryptedStore.ts:54`
- `server/storage/encryptedStore.ts:77`
- `server/storage/encryptedStore.ts:84`
- `server/storage/encryptedStore.ts:136`
- `server/storage/encryptedStore.ts:144`
- `server/storage/encryptedStore.ts:178`
- `server/storage/encryptedStore.ts:186`

Problem: one module owns env path resolution, filesystem directory creation, key generation/loading, encryption, compression, SQLite connection lifecycle, migrations, document CRUD, blob CRUD, and stats. It is impossible to swap storage backend or key provider without editing this file.

Refactor target: split ports for `StorageConnection`, `KeyProvider`, `Serializer`, `Encryptor`, `DocumentStore`, and `MigrationRunner`. Compose concrete SQLite/AES/Brotli in app startup.

### B-SOLID-022 - App document buckets and storage routes are hard-coded

Principles: OCP, dynamic discovery.

Files:

- `server/storage/appDocumentStore.ts:11`
- `server/storage/appDocumentStore.ts:12`
- `server/storage/appDocumentStore.ts:13`
- `server/storage/appDocumentStore.ts:14`
- `server/routes/appDocumentStorageRoutes.ts:14`
- `server/routes/appDocumentStorageRoutes.ts:39`
- `server/routes/appDocumentStorageRoutes.ts:40`
- `server/routes/appDocumentStorageRoutes.ts:41`
- `server/routes/appDocumentStorageRoutes.ts:42`
- `server/routes/appDocumentStorageRoutes.ts:43`
- `server/routes/appDocumentStorageRoutes.ts:47`

Problem: adding a new app document type requires editing bucket constants and route registration. Delete behavior is special-cased only for provider probe cache.

Refactor target: document types should be descriptors with route, bucket, request key, fallback, permissions, and supported operations.

### B-SOLID-023 - Generation task repository mixes persistence formats, compatibility, assets, rows, stats, and transactions

Principles: SRP, DIP.

Files:

- `server/storage/generation-tasks/generationTaskRepository.ts:20`
- `server/storage/generation-tasks/generationTaskRepository.ts:21`
- `server/storage/generation-tasks/generationTaskRepository.ts:23`
- `server/storage/generation-tasks/generationTaskRepository.ts:38`
- `server/storage/generation-tasks/generationTaskRepository.ts:56`
- `server/storage/generation-tasks/generationTaskRepository.ts:70`
- `server/storage/generation-tasks/generationTaskRepository.ts:79`
- `server/storage/generation-tasks/generationTaskRepository.ts:101`
- `server/storage/generation-tasks/generationTaskRepository.ts:112`
- `server/storage/generation-tasks/generationTaskRepository.ts:116`
- `server/storage/generation-tasks/generationTaskRepository.ts:118`
- `server/storage/generation-tasks/generationTaskRepository.ts:136`
- `server/storage/generation-tasks/generationTaskRepository.ts:138`
- `server/storage/generation-tasks/generationTaskRepository.ts:152`

Problem: repository code coordinates legacy fallback, v2 row loading, encrypted task docs, image asset docs, hydration, active-task filtering, gallery path normalization, transactions, stats, and legacy cleanup. Any storage format or task shape change touches this central module.

Refactor target: separate `TaskHistoryRepository`, `TaskDocumentCodec`, `TaskAssetRepository`, `LegacyHistoryMigration`, and transaction boundary.

### B-SOLID-024 - Generation task codecs are closed over current task/image shapes

Principles: OCP, SRP.

Files:

- `server/storage/generation-tasks/generationTaskCodecs.ts:61`
- `server/storage/generation-tasks/generationTaskCodecs.ts:77`
- `server/storage/generation-tasks/generationTaskCodecs.ts:124`
- `server/storage/generation-tasks/generationTaskCodecs.ts:175`
- `server/storage/generation-tasks/generationTaskCodecs.ts:194`
- `server/storage/generation-tasks/generationTaskCodecs.ts:219`
- `server/storage/generation-tasks/generationTaskCodecs.ts:237`

Problem: codec functions explicitly know top-level images, batch item images, full/thumbnail assets, and how to restore them. New task kinds or image asset kinds require editing this codec.

Refactor target: task kinds should register persistence strategies or image extractors/restorers.

### B-SOLID-025 - Runtime store is a module-level singleton combining cache, persistence, serialization, and event publication

Principles: SRP, DIP, testability.

Files:

- `server/processes/generation-task-runtime/runtimeStore.ts:9`
- `server/processes/generation-task-runtime/runtimeStore.ts:10`
- `server/processes/generation-task-runtime/runtimeStore.ts:11`
- `server/processes/generation-task-runtime/runtimeStore.ts:22`
- `server/processes/generation-task-runtime/runtimeStore.ts:34`
- `server/processes/generation-task-runtime/runtimeStore.ts:51`
- `server/processes/generation-task-runtime/runtimeStore.ts:60`
- `server/processes/generation-task-runtime/runtimeStore.ts:63`
- `server/processes/generation-task-runtime/runtimeStore.ts:64`
- `server/processes/generation-task-runtime/runtimeStore.ts:66`
- `server/processes/generation-task-runtime/runtimeStore.ts:75`
- `server/processes/generation-task-runtime/runtimeStore.ts:84`

Problem: one singleton owns in-memory task state, mutation queues, persistence queues, client serialization, load-on-first-use, and event broadcasting. That prevents multiple runtime instances and makes persistence/event behavior inseparable.

Refactor target: create a `GenerationTaskRuntime` instance with injected `TaskRepository`, `TaskEventBus`, `TaskSerializer`, and clock/id services.

### B-SOLID-026 - Cancellation state is global and tightly coupled to task reducers

Principles: SRP, DIP.

Files:

- `server/processes/generation-task-runtime/cancellation.ts:1`
- `server/processes/generation-task-runtime/cancellation.ts:5`
- `server/processes/generation-task-runtime/cancellation.ts:6`
- `server/processes/generation-task-runtime/cancellation.ts:7`
- `server/processes/generation-task-runtime/cancellation.ts:25`
- `server/processes/generation-task-runtime/cancellation.ts:78`
- `server/processes/generation-task-runtime/cancellation.ts:87`
- `server/processes/generation-task-runtime/cancellation.ts:111`

Problem: cancellation uses module-global maps and imports a client-side batch reducer directly. Adding task families or cancellation policies requires editing this module.

Refactor target: cancellation should be a runtime instance service. Task type behavior should be polymorphic or registered by task kind.

### B-SOLID-027 - Task SSE event bus is global and closed to event channel extension

Principles: SRP, OCP, DIP.

Files:

- `server/processes/generation-task-runtime/taskEvents.ts:13`
- `server/processes/generation-task-runtime/taskEvents.ts:14`
- `server/processes/generation-task-runtime/taskEvents.ts:46`
- `server/processes/generation-task-runtime/taskEvents.ts:71`
- `server/processes/generation-task-runtime/taskEvents.ts:84`
- `server/processes/generation-task-runtime/taskEvents.ts:97`
- `server/processes/generation-task-runtime/taskEvents.ts:104`
- `server/processes/generation-task-runtime/taskEvents.ts:115`
- `server/processes/generation-task-runtime/taskEvents.ts:129`

Problem: the event bus owns connected clients, revision counters, delta diffing, SSE formatting, keep-alive intervals, and reset logic. New event channels or transports require editing this file.

Refactor target: split event store/diffing from transport. Route should subscribe to an injected event bus that can expose channels dynamically.

### B-SOLID-028 - Live image cache is a process-global storage/serialization service

Principles: SRP, DIP.

Files:

- `server/processes/liveGenerationImageStore.ts:13`
- `server/processes/liveGenerationImageStore.ts:14`
- `server/processes/liveGenerationImageStore.ts:16`
- `server/processes/liveGenerationImageStore.ts:50`
- `server/processes/liveGenerationImageStore.ts:53`
- `server/processes/liveGenerationImageStore.ts:70`
- `server/processes/liveGenerationImageStore.ts:89`
- `server/processes/liveGenerationImageStore.ts:105`

Problem: live image storage, id generation, TTL eviction, URL construction, and task serialization are combined in a singleton module.

Refactor target: inject a `LiveAssetStore` and a serializer into runtime/event code.

### B-SOLID-029 - Gallery folder/store code is closed over item kinds and operation kinds

Principles: OCP, SRP.

Files:

- `server/storage/galleryFoldersStore.ts:20`
- `server/storage/galleryFoldersStore.ts:23`
- `server/storage/galleryFoldersStore.ts:67`
- `server/storage/galleryFoldersStore.ts:79`
- `server/storage/galleryFoldersStore.ts:84`
- `server/storage/galleryFoldersStore.ts:100`
- `server/routes/galleryFolderRoutes.ts:31`
- `server/routes/galleryFolderRoutes.ts:36`
- `server/routes/galleryFolderRoutes.ts:102`
- `server/routes/galleryFolderRoutes.ts:119`
- `server/processes/generation-task-runtime/galleryMutations.ts:76`
- `server/processes/generation-task-runtime/galleryMutations.ts:82`

Problem: gallery code knows only `task` and `folder`, and only `move`, `link-copy`, `deep-copy`. Adding a new gallery item kind or operation requires edits across route, store, and runtime mutation code.

Refactor target: gallery item kinds and operations should be registered commands with parse/validate/apply behavior.

### B-SOLID-030 - Download/archive flow mixes route policy, temp cache, data URL parsing, ZIP implementation, and media mapping

Principles: SRP, OCP, DIP.

Files:

- `server/routes/generationTaskDownloadRoutes.ts:23`
- `server/routes/generationTaskDownloadRoutes.ts:37`
- `server/routes/generationTaskDownloadRoutes.ts:42`
- `server/routes/generationTaskDownloadRoutes.ts:53`
- `server/routes/generationTaskDownloadRoutes.ts:74`
- `server/routes/generationTaskDownloadRoutes.ts:80`
- `server/routes/generationTaskDownloadRoutes.ts:97`
- `server/routes/generationTaskDownloadRoutes.ts:133`
- `server/routes/generationTaskDownloadRoutes.ts:160`
- `server/routes/generationTaskDownloadHelpers.ts:22`
- `server/routes/generationTaskDownloadHelpers.ts:83`
- `server/routes/generationTaskDownloadHelpers.ts:130`
- `server/routes/generationTaskDownloadHelpers.ts:145`

Problem: archive selection, filename policy, temporary download cache, image data URL parsing, content disposition, MIME extension mapping, and raw ZIP creation are coupled. Adding a new media type, archive format, or storage backend requires editing helper/route files.

Refactor target: introduce `DownloadService`, `TemporaryDownloadStore`, `ArchiveWriter`, and media-type registry.

### B-SOLID-031 - Infrastructure helpers are placed inside provider contract module

Principles: SRP, DIP.

Files:

- `server/providers/types.ts:141`
- `server/providers/types.ts:145`
- `server/http/cors.ts:2`
- `server/http/corsOrigins.ts:1`
- `server/http/errors.ts:2`

Problem: `server/providers/types.ts` contains provider contracts, `HttpError`, env access, error cause compaction, payload validation, and prompt validation. HTTP CORS/errors import utilities from provider types, creating a dependency from generic HTTP infrastructure into provider-layer code.

Refactor target: move env, HTTP errors, and error normalization into infrastructure/shared modules. Provider types should only define provider contracts.

### B-SOLID-032 - Environment loading mutates `process.env` directly

Principles: DIP, testability.

Files:

- `server/env/loadEnv.ts:9`
- `server/env/loadEnv.ts:19`
- `server/env/loadEnv.ts:20`
- `server/env/loadEnv.ts:30`
- `server/index.ts:14`
- `server/app.ts:12`
- `server/storage/encryptedStore.ts:14`
- `server/storage/encryptedStore.ts:17`
- `server/routes/generationTaskDownloadHelpers.ts:62`

Problem: environment is a global mutable dependency read from many modules. New runtime environments or tests cannot provide configuration without global mutation.

Refactor target: load config once into an immutable `ImageStudioConfig` and inject it into app/storage/provider/download services.

### B-SOLID-033 - Architecture checks are phrase-based and tied to static manifests

Principles: OCP, dynamic discovery, maintainability.

Files:

- `scripts/check-provider-adapters.mjs:4`
- `scripts/check-provider-adapters.mjs:5`
- `scripts/check-provider-adapters.mjs:60`
- `scripts/check-provider-adapters.mjs:71`
- `scripts/check-provider-adapters.mjs:72`
- `scripts/check-provider-adapters.mjs:86`
- `scripts/check-provider-adapters.mjs:95`
- `scripts/check-provider-adapters.mjs:165`
- `scripts/check-storage-architecture.mjs:6`
- `scripts/check-storage-architecture.mjs:50`
- `scripts/check-task-lifecycle.mjs:4`
- `scripts/check-task-lifecycle.mjs:11`

Problem: checks import static registries and assert phrases in source files. This validates the current shape but does not enforce true dynamic discovery or interface-level architecture. Adding modules requires updating static manifests and sometimes check expectations.

Refactor target: checks should inspect discovered manifests and contracts, not hard-coded files/phrases. Debt budgets should fail on architectural smells, not just line counts and strings.

### B-SOLID-034 - Manifests describe architecture but do not provide loading boundaries

Principles: OCP, dynamic discovery.

Files:

- `server/providers/manifest.ts:5`
- `server/providers/manifest.ts:6`
- `server/providers/manifest.ts:16`
- `server/providers/manifest.ts:22`
- `server/providers/openai-compatible/manifest.ts:7`
- `server/providers/comfyui/manifest.ts:7`
- `server/providers/comfyui/manifest.ts:41`

Problem: provider manifests include architecture check metadata, but registry still imports them statically. The manifest system documents file expectations rather than serving as an independently discovered plugin boundary.

Refactor target: manifest files should be the discovery boundary. Architecture metadata should be derived from module capabilities, not manually curated in every manifest.

### B-SOLID-035 - No dependency-injected application context

Principles: DIP, SRP, testability.

Files:

- `server/app.ts:7`
- `server/routes/index.ts:11`
- `server/providers/registry.ts:11`
- `server/integrations/registry.ts:3`
- `server/storage/encryptedStore.ts:43`
- `server/processes/generation-task-runtime/runtimeStore.ts:9`
- `server/processes/generation-task-runtime/taskEvents.ts:13`
- `server/processes/generation-task-runtime/cancellation.ts:5`

Problem: services are accessed through module imports and global singletons rather than an app context. This prevents multiple app instances with different provider sets/storage/runtime settings and makes dynamic plugin loading awkward.

Refactor target: create a `BackendAppContext` assembled in one composition root from discovered modules. Routes/runtime/storage should receive ports from that context.

## Dynamic Discovery Refactor Boundaries

To satisfy the strict extensibility rule, these boundaries should become discovery-based:

- Providers: discover server/client provider manifests and adapter ports.
- Provider modes: discover mode descriptors and submit handlers.
- Provider response parsing: adapter-owned response/stream/raw policies.
- ComfyUI workflow plugins: discover plugin descriptors with schema, defaults, ordering, validation, and graph hooks.
- ComfyUI resources: discover resource descriptors by kind.
- Integrations: discover integration definitions, runtime adapters, actions, and optional routes.
- Routes: discover route groups from modules rather than central imports.
- Storage documents: discover document bucket/route descriptors.
- Task runtime: register task kinds, image extractors, cancellation policies, and persistence strategies.
- Downloads: register archive writers and media type handlers.
- Tooling: validate discovered contracts, not hard-coded phrase checks.

## Backend Files Reviewed Or Touched By Findings

- `server/app.ts`
- `server/env/loadEnv.ts`
- `server/http/cors.ts`
- `server/http/corsOrigins.ts`
- `server/http/errors.ts`
- `server/index.ts`
- `server/integrations/builtins.ts`
- `server/integrations/registry.ts`
- `server/integrations/telegram/adapter.ts`
- `server/integrations/telegram/runtime.ts`
- `server/integrations/telegram/types.ts`
- `server/processes/generation-task-runtime/batchRun.ts`
- `server/processes/generation-task-runtime/cancellation.ts`
- `server/processes/generation-task-runtime/galleryMutations.ts`
- `server/processes/generation-task-runtime/providerPipeline.ts`
- `server/processes/generation-task-runtime/runtimeStore.ts`
- `server/processes/generation-task-runtime/taskEvents.ts`
- `server/processes/liveGenerationImageStore.ts`
- `server/providers/comfyui/adapter.ts`
- `server/providers/comfyui/manifest.ts`
- `server/providers/comfyui/probeSuite.ts`
- `server/providers/comfyui/progressStream.ts`
- `server/providers/comfyui/requestHandlers.ts`
- `server/providers/comfyui/resources.ts`
- `server/providers/comfyui/settingsSchema.ts`
- `server/providers/comfyui/workflowConfig.ts`
- `server/providers/comfyui/workflowExtensions.ts`
- `server/providers/comfyui/workflowPluginValidation.ts`
- `server/providers/comfyui/workflowSamplerNodes.ts`
- `server/providers/comfyui/workflowTypes.ts`
- `server/providers/manifest.ts`
- `server/providers/openai-compatible/probeSuite.ts`
- `server/providers/openai-compatible/settingsSchema.ts`
- `server/providers/openai-compatible/submitOperation.ts`
- `server/providers/registry.ts`
- `server/providers/types.ts`
- `server/routes/appDocumentStorageRoutes.ts`
- `server/routes/galleryFolderRoutes.ts`
- `server/routes/generation/providerSubmitRoutes.ts`
- `server/routes/generation/requestParsing.ts`
- `server/routes/generation/taskRoutes.ts`
- `server/routes/generationTaskDownloadHelpers.ts`
- `server/routes/generationTaskDownloadRoutes.ts`
- `server/routes/generationTaskHistoryRoutes.ts`
- `server/routes/index.ts`
- `server/routes/integrationRoutes.ts`
- `server/routes/providerRoutes.ts`
- `server/routes/telegramMiniAppRoutes.ts`
- `server/storage/appDocumentStore.ts`
- `server/storage/encryptedStore.ts`
- `server/storage/galleryFoldersStore.ts`
- `server/storage/generation-tasks/generationTaskCodecs.ts`
- `server/storage/generation-tasks/generationTaskRepository.ts`
- `server/storage/generation-tasks/generationTaskRows.ts`
- `server/storage/integrationSettingsStore.ts`
- `src/domain/integrations.ts`
- `src/domain/providerSettings.ts`
- `src/entities/generation-params/providerState.ts`
- `src/entities/provider/registry.ts`
- `src/entities/provider/types.ts`
- `src/entities/studio-settings/index.ts`
- `src/providers/comfyui/responseAdapter.ts`
- `src/providers/openai-compatible/responseAdapter.ts`
- `scripts/check-provider-adapters.mjs`
- `scripts/check-storage-architecture.mjs`
- `scripts/check-task-lifecycle.mjs`

## Notes

- This audit intentionally treats "add a couple of lines to a registry" as an OCP failure, per the request.
- Existing architecture checks show that the project already values boundaries, but the current checks preserve static composition rather than enforcing dynamic module discovery.
- The current worktree already had many deleted docs and unrelated modified files before this audit. This document does not restore or revert them.
