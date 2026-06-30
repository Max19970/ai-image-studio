# Frontend SOLID / Extensibility Audit

Дата аудита: 2026-06-30.

Область: `src/**` фронтенда Image Studio: React, TypeScript, UI registry, provider/generation-param model, app workspace, settings, integrations, storage-sync/infrastructure API. Серверные файлы не аудировались как frontend-код, но упоминаются в разделе проверок, когда проектный скрипт сам вывел их в debt summary.

## Правило оценки

В этом документе расширяемость трактуется строго: если добавление нового провайдера, параметра, вкладки, интеграции, workflow-плагина, команды, workspace-зоны, locale или backend operation требует изменить существующий production-файл хотя бы на одну строку, это считается нарушением Open/Closed Principle и кандидатом на dynamic discovery, self-registration, manifest composition или dependency inversion.

Проверочные команды:

- `npm run arch:check` - passed, 0 boundary violations.
- `npm run interface:check` - passed; 56 definitions, 59 placements, 39 slots. UI `definition.ts` / `placement.ts` частично уже используют discovery.
- `npm run params:check` - passed; 16 logical params, 16 field definitions, 16 placements.
- `npm run storage:check` - passed.
- `npm run providers:check` - passed; 2 server provider manifests, 2 client provider manifests, provider adapter check passed.
- `npm run debt:check` - failed/warned: frontend hotspots over limits include `src/entities/generation-params/comfyui/state.ts`, `src/entities/generation-params/comfyui/ComfyUiSurfaceFields.tsx`, `src/entities/generation-params/comfyui/extensions/workflowPluginsExtension.tsx`, `src/features/request-presets/elements/preset-menu/RequestPresetMenuAction.tsx`, `src/entities/provider/compatibility.ts`, `src/app/commands/createComposerCommands.ts`, `src/providers/openai-compatible/responseAdapter.ts`.

## Already Good

Не считать нарушением:

- `src/interface/registry/definitions.ts` and `src/interface/registry/placements.ts` use `import.meta.glob(..., { eager: true })`. New feature element definitions/placements can be discovered without editing central import lists.
- `src/entities/generation-params/registry.ts` dynamically discovers UI field definitions and field placements.

These are useful target patterns for the remaining debt below.

## Findings

### SOLID-001: Provider adapters are manually registered

Principles: OCP, DIP.

Files:

- `src/entities/provider/registry.ts:1`
- `src/entities/provider/registry.ts:2`
- `src/entities/provider/registry.ts:7`
- `src/entities/provider/registry.ts:8`
- `src/entities/provider/registry.ts:10`
- `src/entities/provider/registry.ts:27`
- `src/providers/openai-compatible/manifest.ts`
- `src/providers/comfyui/manifest.ts`
- `src/providers/openai-compatible/definition.ts`
- `src/providers/comfyui/definition.ts`

Problem: `registry.ts` imports the current providers directly, exports their definitions directly, and builds `providerClientManifests` by hand. Adding a provider requires editing this registry. Unknown provider ids silently fall back to OpenAI-compatible behavior, so extension failures degrade into wrong substitution instead of explicit missing-adapter handling.

Required direction: discover `src/providers/*/manifest.ts` with `import.meta.glob`, validate manifest ids, and make fallback policy injectable/explicit.

### SOLID-002: Provider surfaces and request surfaces are manually listed

Principles: OCP, DIP.

Files:

- `src/entities/generation-params/surfaceRegistry.ts:3`
- `src/entities/generation-params/surfaceRegistry.ts:4`
- `src/entities/generation-params/surfaceRegistry.ts:7`
- `src/entities/generation-params/requestSurface.ts:2`
- `src/entities/generation-params/requestSurface.ts:3`
- `src/entities/generation-params/requestSurface.ts:4`
- `src/entities/generation-params/requestSurface.ts:33`
- `src/entities/generation-params/comfyui/requestSurface.ts`
- `src/entities/generation-params/openAiCompatibleSurface.tsx`
- `src/entities/generation-params/openAiCompatiblePayload.ts`

Problem: new generation surface types require central edits in two registries. The provider registry points at surface ids, but the actual surface implementations are not discovered from provider manifests. This keeps provider extension split across provider, generation-param, request-surface, and surface registry files.

Required direction: let provider manifests expose/lazy-load their surface modules, or discover `surface.manifest.ts` modules by convention.

### SOLID-003: Logical generation params still use a central import list

Principles: OCP, SRP.

Files:

- `src/entities/generation-params/logicalRegistry.ts:17`
- `src/entities/generation-params/logicalRegistry.ts:18`
- `src/entities/generation-params/logicalRegistry.ts:19`
- `src/entities/generation-params/logicalRegistry.ts:20`
- `src/entities/generation-params/logicalRegistry.ts:21`
- `src/entities/generation-params/logicalRegistry.ts:22`
- `src/entities/generation-params/logicalRegistry.ts:23`
- `src/entities/generation-params/logicalRegistry.ts:24`
- `src/entities/generation-params/logicalRegistry.ts:25`
- `src/entities/generation-params/logicalRegistry.ts:26`
- `src/entities/generation-params/logicalRegistry.ts:27`
- `src/entities/generation-params/logicalRegistry.ts:28`
- `src/entities/generation-params/logicalRegistry.ts:29`
- `src/entities/generation-params/logicalRegistry.ts:30`
- `src/entities/generation-params/logicalRegistry.ts:31`
- `src/entities/generation-params/logicalRegistry.ts:32`
- `src/entities/generation-params/logicalRegistry.ts:34`
- all `src/entities/generation-params/fields/*/param.ts`

Problem: field UI discovery exists, but logical parameter definitions are still manually imported and ordered. Adding a new logical param requires editing `logicalRegistry.ts`.

Required direction: discover `fields/**/param.ts`, sort by declared order/group, and validate ownership (`fieldDefinitionId`, `placementIds`, i18n namespace) at runtime/build time.

### SOLID-004: Parameter placement is duplicated in one central file

Principles: OCP, SRP.

Files:

- `src/entities/generation-params/placements/composer.parameters.placement.ts`
- all current `src/entities/generation-params/fields/*/definition.ts`
- all current `src/entities/generation-params/fields/*/param.ts`

Problem: each field already owns metadata, but placement ids/slots/order/capabilities are repeated in one central placement list. Adding or moving a field requires editing this file.

Required direction: co-locate placement with the field owner or export placement from each field folder and let `registry.ts` discover it.

### SOLID-005: ComfyUI workflow plugins are hardcoded in four places

Principles: OCP, SRP, DIP.

Files:

- `src/entities/generation-params/comfyui/state.ts:32`
- `src/entities/generation-params/comfyui/state.ts:81`
- `src/entities/generation-params/comfyui/state.ts:174`
- `src/entities/generation-params/comfyui/state.ts:209`
- `src/entities/generation-params/comfyui/state.ts:220`
- `src/entities/generation-params/comfyui/extensions/workflowPluginsExtension.tsx:125`
- `src/entities/generation-params/comfyui/extensions/workflowPluginsExtension.tsx:201`
- `src/entities/generation-params/comfyui/extensions/workflowPluginsExtension.tsx:234`
- `src/entities/generation-params/comfyui/extensions/workflowPluginsPayloadExtension.ts:5`
- `src/entities/generation-params/comfyui/extensions/workflowPluginsPayloadExtension.ts:28`
- `src/entities/generation-params/comfyui/extensions/registry.ts:5`
- `src/entities/generation-params/comfyui/extensions/payloadRegistry.ts:5`

Problem: one workflow plugin touches type unions, option arrays, normalization aliases, legacy migration, UI definitions, payload mapping, summary entries, and extension registries. Adding a plugin cannot be done by adding a module.

Required direction: define `workflow-plugin.manifest.tsx` per plugin with schema, aliases, defaults, UI, payload, summary, conflicts, and order; discover manifests.

### SOLID-006: ComfyUI state module has too many responsibilities

Principles: SRP, ISP.

Files:

- `src/entities/generation-params/comfyui/state.ts`

Problem: the same 423-line module owns public types, defaults, option lists, validation/coercion helpers, legacy migration, state normalization, provider-param conversion, base payload construction, and parameter summary generation. The debt checker flags it over the 300-line budget.

Required direction: split into `schema/defaults`, `normalize`, `legacyMigration`, `payload/basePayload`, and `summary/baseSummary`; then let plugin manifests extend these pieces.

### SOLID-007: ComfyUI UI fields mix primitive fields, resource lookup, LoRA registry interaction, drag/drop, and provider state

Principles: SRP, DIP.

Files:

- `src/entities/generation-params/comfyui/ComfyUiSurfaceFields.tsx`
- `src/entities/generation-params/comfyui/ui/ComfyUiLoraQuickGroup.tsx`
- `src/features/settings/sections/generation-api/comfyui-settings/ComfyUiSettingsPanel.tsx`
- `src/features/settings/sections/generation-api/comfyui-settings/useComfyUiSettingsDraft.ts`

Problem: provider-owned parameter UI directly reads app settings/resource caches and implements LoRA selection/drag behavior inside field components. Adding a resource-backed field or another provider-owned registry requires copying this shape.

Required direction: introduce provider resource field descriptors and reusable registry/selection controllers injected through provider surface context.

### SOLID-008: Provider extension registries are not dynamically discovered

Principles: OCP.

Files:

- `src/entities/generation-params/comfyui/extensions/registry.ts`
- `src/entities/generation-params/comfyui/extensions/payloadRegistry.ts`
- `src/entities/generation-params/comfyui/payload.ts`
- `src/entities/generation-params/comfyui/summary.ts`
- `src/entities/generation-params/comfyui/ComfyUiGenerationSurface.tsx`

Problem: the extension contract exists, but extensions are arrays imported by hand. Adding an extension still edits registry files.

Required direction: discover extension modules by provider/surface id and extension phase (`ui`, `payload`, `summary`) with deterministic ordering.

### SOLID-009: Provider contracts are broad mandatory interfaces

Principles: ISP, LSP.

Files:

- `src/entities/provider/types.ts:72`
- `src/entities/provider/types.ts:87`
- `src/entities/provider/types.ts:107`
- `src/entities/generation-params/surfaceTypes.ts:53`
- `src/entities/generation-params/requestSurfaceTypes.ts:24`

Problem: `ProviderRequestAdapter`, `ProviderResponseAdapter`, `ProviderAdapterDefinition`, and `ProviderGenerationSurface` force every adapter/surface into a large all-in-one contract. Local workflow providers still expose concepts such as raw JSON parsing and edit endpoint defaults; logical and provider-owned surfaces both implement snapshot/payload/UI methods in one interface.

Required direction: split capabilities into smaller contracts: transport, payload builder, resource provider, settings schema, response parser, preview stream, snapshot provider, UI surface, summary provider.

### SOLID-010: Provider compatibility rules are centralized

Principles: OCP, SRP.

Files:

- `src/entities/provider/compatibility.ts`
- `src/entities/provider/modeResolution.ts`
- `src/entities/provider/controlSurface.ts`
- `src/entities/provider/capabilities.ts`
- `src/entities/provider/request.ts`
- `src/entities/provider/valueConstraints.ts`

Problem: provider modes, attachment requirements, missing attachment text, request validation, and compatibility sanitization are centralized. New attachment roles, new mode semantics, or new provider-specific compatibility behavior require edits here.

Required direction: move compatibility policies into provider/mode manifests and call them through narrow strategy interfaces.

### SOLID-011: Workspace state is a monolithic app model

Principles: SRP, ISP.

Files:

- `src/app/workspace/types.ts:22`
- `src/app/workspace/types.ts:91`
- `src/app/workspace/types.ts:111`
- `src/app/workspace/types.ts:118`
- `src/app/workspace/useWorkspaceState.ts:12`
- `src/app/workspace/useWorkspaceDerivedState.ts:22`
- `src/app/workspace/useWorkspaceCommands.ts:7`
- `src/app/workspace/useWorkspaceViewModel.ts:10`
- `src/app/workspace/createWorkspaceContexts.ts:8`

Problem: one workspace view model aggregates composer, settings, navigation, gallery filesystem, task history, execution, provider probing, presets, and batch composer. A new workspace slice requires changing central state type, view model, derived state, command composition, and context factories.

Required direction: dynamic workspace slices with self-registered state, derived selectors, commands, context adapters, and slot contributions.

### SOLID-012: Command model is closed over current features

Principles: OCP, ISP.

Files:

- `src/interface/context/commands.ts:25`
- `src/interface/context/commands.ts:41`
- `src/interface/context/commands.ts:73`
- `src/interface/context/commands.ts:96`
- `src/app/commands/commandDeps.ts:177`
- `src/app/commands/appCommands.ts:12`
- `src/app/commands/createComposerCommands.ts`
- `src/app/commands/createBatchComposerCommands.ts`
- `src/app/commands/createGalleryCommands.ts`
- `src/app/commands/createSettingsCommands.ts`
- `src/app/commands/createDetailCommands.ts`
- `src/app/commands/createParameterCommands.ts`
- `src/app/commands/createRequestPresetCommands.ts`

Problem: `AppCommands` is a fixed object keyed by current feature groups. Adding a feature command group requires editing command interfaces, dependency interfaces, central command factory, and workspace command wiring. `createComposerCommands.ts` is also over its calibrated growth cap.

Required direction: command registry or command-bus contributions discovered from feature modules, with command groups attached to slots/contexts by id.

### SOLID-013: Context interfaces are too fat for slot consumers

Principles: ISP, DIP.

Files:

- `src/interface/context/workspace/composerDock.ts`
- `src/interface/context/workspace/main.ts`
- `src/interface/context/workspace/gallery.ts`
- `src/interface/context/workspace/settings.ts`
- `src/features/settings/settingsTypes.ts:20`
- `src/features/settings/settingsTypes.ts:56`
- `src/features/composer/composerTypes.ts`
- `src/features/batch-composer/batchComposerTypes.ts`

Problem: slot elements receive broad contexts containing data/actions for many sibling concerns. For example, `SettingsSectionContext` exposes interface theme, provider/model editor state, ComfyUI caches, LoRA registry actions, integration commands, and probe state together. Consumers are forced to depend on a large unstable shape.

Required direction: per-slot capability contexts and adapter functions, not one section-wide context bag.

### SOLID-014: App shell hardcodes global integrations and routing

Principles: OCP, SRP, DIP.

Files:

- `src/app/App.tsx:7`
- `src/app/App.tsx:10`
- `src/app/App.tsx:16`
- `src/app/App.tsx:25`
- `src/app/App.tsx:45`
- `src/app/App.tsx:59`
- `src/app/App.tsx:61`
- `src/app/App.tsx:67`
- `src/app/App.tsx:73`
- `src/app/App.tsx:81`
- `src/app/App.tsx:87`

Problem: the app shell directly initializes Telegram Mini App, owns motion/document visibility, manually lazy-loads only the detail route, and hardcodes workspace slot regions. New app-level integration, route, or shell state requires editing `App.tsx`.

Required direction: app-shell contribution registry for routes, document effects, integration attributes, and workspace regions.

### SOLID-015: Settings tabs and Generation API focus are closed unions with branchy UI

Principles: OCP, SRP.

Files:

- `src/features/settings/settingsTypes.ts:10`
- `src/features/settings/settingsTypes.ts:11`
- `src/features/settings/SettingsPage.tsx:36`
- `src/features/settings/SettingsPage.tsx:79`
- `src/features/settings/sections/generation-api/GenerationApiSettingsSection.tsx:33`
- `src/features/settings/sections/generation-api/GenerationApiSettingsSection.tsx:34`
- `src/features/settings/sections/generation-api/GenerationApiSettingsSection.tsx:35`
- `src/features/settings/sections/generation-api/GenerationApiSettingsSection.tsx:38`
- `src/features/settings/sections/generation-api/GenerationApiSettingsSection.tsx:55`
- `src/features/settings/sections/generation-api/GenerationApiSettingsSection.tsx:56`
- `src/features/settings/sections/generation-api/GenerationApiSettingsSection.tsx:57`
- `src/features/settings/sections/generation-api/GenerationApiSettingsSection.tsx:61`
- `src/interface/placements/settings.tabs.placement.ts`
- `src/interface/placements/settings.sections.placement.ts`

Problem: top-level settings tabs use registry placements, but the settings state model and generation-api sub-focus are hardcoded unions/conditionals. Adding a settings subpage or provider-specific settings focus requires edits in existing files.

Required direction: settings sections and sub-focus panels should self-register tab id, label, state owner, context adapter, and desktop/mobile renderers.

### SOLID-016: Settings page assembles a giant context by hand

Principles: SRP, ISP.

Files:

- `src/features/settings/SettingsPage.tsx:79`
- `src/features/settings/SettingsPage.tsx:88`
- `src/features/settings/SettingsPage.tsx:104`
- `src/features/settings/SettingsPage.tsx:112`
- `src/features/settings/SettingsPage.tsx:128`
- `src/features/settings/settingsTypes.ts:20`

Problem: `SettingsPage` owns draft state, dirty/saved flags, locale/theme actions, generation API state, ComfyUI state, save/reset, and the context projection for every settings section. Adding another settings domain makes this context grow again.

Required direction: settings state slices and section-specific context providers composed from contributions.

### SOLID-017: ComfyUI settings are embedded in generic Generation API settings

Principles: OCP, SRP.

Files:

- `src/features/settings/sections/generation-api/useGenerationApiSettingsDraft.ts:64`
- `src/features/settings/sections/generation-api/useGenerationApiSettingsDraft.ts:76`
- `src/features/settings/sections/generation-api/useGenerationApiSettingsDraft.ts:190`
- `src/features/settings/sections/generation-api/useGenerationApiSettingsDraft.ts:211`
- `src/features/settings/sections/generation-api/comfyui-settings/useComfyUiSettingsDraft.ts`
- `src/features/settings/sections/generation-api/comfyui-settings/ComfyUiSettingsPanel.tsx`
- `src/features/settings/sections/generation-api/model-editor/ModelFields.tsx:1`
- `src/features/settings/sections/generation-api/model-editor/ModelFields.tsx:28`
- `src/features/settings/sections/generation-api/provider-editor/ProviderCoreFields.tsx:7`

Problem: the generic Generation API section imports and spreads ComfyUI-specific state. Model/provider editors branch on adapter ids/resource kinds and pull ComfyUI caches directly.

Required direction: provider-specific settings contributions injected by provider manifest.

### SOLID-018: Integration registry and UI are Telegram-specific

Principles: OCP, SRP.

Files:

- `src/domain/integrations.ts:102`
- `src/domain/integrations.ts:160`
- `src/features/settings/sections/integrations/IntegrationsSettingsSection.tsx:8`
- `src/features/settings/sections/integrations/IntegrationsSettingsSection.tsx:35`
- `src/features/settings/sections/integrations/TelegramIntegrationPanel.tsx`
- `src/features/settings/sections/integrations/useIntegrationSettingsDraft.ts:5`
- `src/features/settings/sections/integrations/useIntegrationSettingsDraft.ts:101`
- `src/features/settings/sections/integrations/useIntegrationSettingsDraft.ts:126`

Problem: the domain registry contains only Telegram by direct constant, the settings panel renders Telegram with an `activeDefinition.id === 'telegram'` branch, and the integration draft hook serializes Telegram-specific fields. Adding another integration requires editing domain and settings code.

Required direction: integration manifests with settings panel, draft serializer/deserializer, actions, and runtime status renderer discovered by id.

### SOLID-019: I18n locales are statically imported and bundled

Principles: OCP, DIP.

Files:

- `src/shared/i18n/registry.ts:1`
- `src/shared/i18n/registry.ts:2`
- `src/shared/i18n/registry.ts:7`
- `src/shared/i18n/registry.ts:12`
- `src/shared/i18n/locales/en/index.ts:16`
- `src/shared/i18n/locales/ru/index.ts:16`
- `src/features/settings/sections/interface/InterfaceSettingsSection.tsx`

Problem: adding a locale requires editing the locale registry and shipping all dictionaries eagerly. This ignores dynamic module loading for locale packs.

Required direction: discover locale metadata and lazy-load dictionaries by locale id.

### SOLID-020: Feature flags are a closed static object

Principles: OCP.

Files:

- `src/shared/features/features.config.ts:1`
- `src/shared/features/features.config.ts:12`
- `src/shared/features/features.config.ts:17`

Problem: feature ids are manually edited in one object. Feature modules cannot declare their own flags/defaults, and dynamic plugin features cannot participate without central edits.

Required direction: feature manifest discovery with environment/user override merge.

### SOLID-021: Infrastructure API is a multi-domain service module

Principles: SRP, DIP.

Files:

- `src/infrastructure/api.ts:8`
- `src/infrastructure/api.ts:40`
- `src/infrastructure/api.ts:49`
- `src/infrastructure/api.ts:65`
- `src/infrastructure/api.ts:81`
- `src/infrastructure/api.ts:97`
- `src/infrastructure/api.ts:113`
- `src/infrastructure/api.ts:129`
- `src/infrastructure/api.ts:155`
- `src/infrastructure/api.ts:163`
- `src/infrastructure/api.ts:167`
- `src/infrastructure/api.ts:171`
- `src/infrastructure/api.ts:181`
- `src/infrastructure/api.ts:199`
- `src/infrastructure/api.ts:216`
- `src/infrastructure/api.ts:238`

Problem: one file handles fetch wrapper, API error parsing, generation enqueue, batch enqueue, task deletion/clear/cancel, batch-item cancel, ZIP download with DOM side effect, provider probing, quick check, and resource loading. It also imports provider registry directly for submit proxy construction.

Required direction: split into domain clients (`generationTasksClient`, `batchClient`, `galleryDownloadClient`, `providerProbeClient`, `providerResourceClient`) and inject transport/provider submit builders.

### SOLID-022: Storage sync hardcodes local+remote dual write

Principles: DIP, OCP.

Files:

- `src/processes/storage-sync/studioSettings.ts:4`
- `src/processes/storage-sync/studioSettings.ts:5`
- `src/processes/storage-sync/studioSettings.ts:11`
- `src/processes/storage-sync/studioSettings.ts:22`
- `src/processes/storage-sync/imageParams.ts:10`
- `src/processes/storage-sync/imageParams.ts:21`
- `src/infrastructure/storage/localStudioSettingsStore.ts`
- `src/infrastructure/storage/remoteStudioSettingsStore.ts`
- `src/infrastructure/storage/localImageParamsStore.ts`
- `src/infrastructure/storage/remoteImageParamsStore.ts`

Problem: the sync process imports concrete local and remote stores and embeds fallback/write-through policy per document type. Adding another persistence backend or sync policy requires editing existing sync modules.

Required direction: storage document registry with backend strategy injection and reusable write-through/fallback orchestration.

### SOLID-023: Request preset menu is a feature, dialog, data panel, search, editor, and responsive shell in one file

Principles: SRP, ISP.

Files:

- `src/features/request-presets/elements/preset-menu/RequestPresetMenuAction.tsx:30`
- `src/features/request-presets/elements/preset-menu/RequestPresetMenuAction.tsx:44`
- `src/features/request-presets/elements/preset-menu/RequestPresetMenuAction.tsx:64`
- `src/features/request-presets/elements/preset-menu/RequestPresetMenuAction.tsx:79`
- `src/features/request-presets/elements/preset-menu/RequestPresetMenuAction.tsx:207`
- `src/features/request-presets/elements/preset-menu/RequestPresetMenuAction.tsx:244`
- `src/features/request-presets/elements/preset-menu/RequestPresetMenuAction.tsx:266`

Problem: the same file handles controller adaptation, date formatting, search predicate, editor state, save/update/delete/apply actions, dialog focus/escape behavior, portal rendering, mobile bottom sheet, desktop popover, and slot action button. It is over the 300-line debt budget.

Required direction: split into preset controller adapter, pure list/search model, editor panel, responsive shell, and slot action.

### SOLID-024: Batch draft toolbar mixes menu composition, provider rules, files, presets, and responsive shell

Principles: SRP, DIP.

Files:

- `src/features/batch-composer/sections/draft-toolbar/BatchDraftToolbarSection.tsx:6`
- `src/features/batch-composer/sections/draft-toolbar/BatchDraftToolbarSection.tsx:20`
- `src/features/batch-composer/sections/draft-toolbar/BatchDraftToolbarSection.tsx:31`
- `src/features/batch-composer/sections/draft-toolbar/BatchDraftToolbarSection.tsx:38`
- `src/features/batch-composer/sections/draft-toolbar/BatchDraftToolbarSection.tsx:93`
- `src/features/batch-composer/sections/draft-toolbar/BatchDraftToolbarSection.tsx:189`
- `src/features/batch-composer/sections/draft-toolbar/BatchDraftToolbarSection.tsx:205`
- `src/features/batch-composer/sections/draft-toolbar/BatchDraftToolbarSection.tsx:257`

Problem: toolbar imports provider compatibility rules, model picker, preset dialog, popover/sheet primitives, file inputs, and menu action rendering. Adding a new draft action or attachment role requires editing this menu.

Required direction: action contribution registry for batch draft toolbar, with provider attachment policies supplied by provider/mode manifest.

### SOLID-025: ImageComposer constructs too much feature context locally

Principles: SRP, ISP.

Files:

- `src/features/composer/ImageComposer.tsx`
- `src/features/composer/composerTypes.ts`
- `src/interface/placements/composer.layout.placement.ts`
- `src/interface/placements/composer.tools.placement.ts`

Problem: `ImageComposer` owns popover state, expanded state, file input refs, attachment flattening, provider model options, control surface resolution, provider attachment logic, keyboard submit, and two large context objects. Any new composer capability tends to expand these context types and this component.

Required direction: composer capability slices: attachments controller, provider model controller, popover controller, prompt controller, and slot-specific contexts.

### SOLID-026: Detail, gallery, and settings sections depend on global command/context shapes

Principles: ISP, DIP.

Files:

- `src/features/detail/ImageDetailPage.tsx`
- `src/features/detail/detailUi.tsx`
- `src/features/detail/sections/**`
- `src/features/gallery/ResultsGallery.tsx`
- `src/features/gallery/galleryUi.tsx`
- `src/features/gallery/sections/**`
- `src/features/settings/sections/**`
- `src/interface/context/workspace/detail.ts`
- `src/interface/context/workspace/gallery.ts`
- `src/interface/context/workspace/settings.ts`

Problem: sections are slot-based, but they still compile against broad app-owned context/command contracts. This is better than a monolith, yet still not fully extensible because the central context contracts must grow for new section needs.

Required direction: slot-local context adapters and capability-specific props instead of page-wide context bags.

### SOLID-027: Direct concrete imports bypass dependency inversion in UI and app layers

Principles: DIP.

Files:

- `src/app/App.tsx:7`
- `src/app/workspace/useWorkspaceDerivedState.ts:2`
- `src/app/workspace/useWorkspaceDerivedState.ts:3`
- `src/app/workspace/useWorkspaceDerivedState.ts:7`
- `src/app/workspace/useWorkspaceDerivedState.ts:11`
- `src/app/workspace/useWorkspaceCommands.ts:2`
- `src/features/settings/sections/generation-api/model-editor/ModelFields.tsx:2`
- `src/features/settings/sections/generation-api/provider-editor/ProviderCoreFields.tsx:7`
- `src/features/settings/sections/generation-api/comfyui-settings/ComfyUiSettingsPanel.tsx:3`
- `src/features/settings/sections/integrations/IntegrationsSettingsSection.tsx:8`
- `src/features/detail/sections/snapshot/DetailSnapshotSections.tsx:3`

Problem: UI/app modules call concrete domain registries, infrastructure APIs, Telegram integration, and ComfyUI panels directly. This makes extension points compile-time dependencies instead of runtime contributions.

Required direction: inject registries/services through app composition or feature manifests; UI should depend on interfaces/context capabilities only.

### SOLID-028: Static lazy loading is limited to a few manually named modules

Principles: OCP, performance/dynamic loading debt.

Files:

- `src/app/App.tsx:10`
- `src/features/**/definition.ts`
- `src/interface/registry/lazyElement.tsx`
- `src/interface/registry/definitions.ts`
- `src/interface/registry/placements.ts`
- `src/entities/generation-params/registry.ts`
- `src/entities/provider/registry.ts`
- `src/shared/i18n/registry.ts`

Problem: element components use `lazyElementComponent`, but definitions/placements are eagerly discovered, provider manifests are statically imported, locale dictionaries are eagerly imported, and provider-owned ComfyUI UI is statically linked through registries. Dynamic loading is partial, not systematic.

Required direction: separate lightweight manifests from lazy component/adapter loaders. Keep discovery eager only for metadata; load UI, provider adapters, locale dictionaries, and heavy provider surfaces lazily.

### SOLID-029: Static strings and provider copy live in code instead of extension-owned resources

Principles: SRP, OCP.

Files:

- `src/entities/generation-params/comfyui/state.ts`
- `src/entities/generation-params/comfyui/extensions/workflowPluginsExtension.tsx`
- `src/entities/generation-params/comfyui/extensions/workflowPluginsPayloadExtension.ts`
- `src/providers/comfyui/requestAdapter.ts`
- `src/domain/integrations.ts`
- `src/features/settings/sections/integrations/useIntegrationSettingsDraft.ts`

Problem: labels, warning strings, default integration messages, provider warning text, payload labels, and provider-specific copy are embedded in TypeScript modules. New provider/integration copy requires code edits and cannot be loaded as extension-owned i18n resources.

Required direction: extension manifests should declare i18n namespaces and lazy dictionaries; warning builders should return translation keys plus vars.

### SOLID-030: Current debt budget confirms oversized frontend hotspots

Principles: SRP.

Files:

- `src/entities/generation-params/comfyui/state.ts`
- `src/entities/generation-params/comfyui/ComfyUiSurfaceFields.tsx`
- `src/entities/generation-params/comfyui/extensions/workflowPluginsExtension.tsx`
- `src/features/request-presets/elements/preset-menu/RequestPresetMenuAction.tsx`
- `src/entities/provider/compatibility.ts`
- `src/entities/generation-params/ParamControls.module.css`
- `src/app/commands/createComposerCommands.ts`
- `src/providers/openai-compatible/responseAdapter.ts`

Problem: the project debt checker already flags these as budget/growth violations. For SOLID purposes, these files are not bad solely because they are long; they are bad because their responsibilities map to multiple independent axes of change.

Required direction: split along axes of change and add explicit budgets for registries, provider-owned UI, and command factories.

## Cross-Cutting Affected File Matrix

Provider extensibility:

- `src/entities/provider/registry.ts`
- `src/entities/provider/types.ts`
- `src/entities/provider/compatibility.ts`
- `src/entities/provider/modeResolution.ts`
- `src/entities/provider/controlSurface.ts`
- `src/entities/provider/request.ts`
- `src/entities/provider/valueConstraints.ts`
- `src/providers/openai-compatible/**`
- `src/providers/comfyui/**`
- `src/features/settings/sections/generation-api/**`

Generation parameters and surfaces:

- `src/entities/generation-params/logicalRegistry.ts`
- `src/entities/generation-params/registry.ts`
- `src/entities/generation-params/placements/composer.parameters.placement.ts`
- `src/entities/generation-params/surfaceRegistry.ts`
- `src/entities/generation-params/requestSurface.ts`
- `src/entities/generation-params/surfaceTypes.ts`
- `src/entities/generation-params/requestSurfaceTypes.ts`
- `src/entities/generation-params/extensionTypes.ts`
- `src/entities/generation-params/fields/**`
- `src/entities/generation-params/comfyui/**`

Workspace/app composition:

- `src/app/App.tsx`
- `src/app/workspace/types.ts`
- `src/app/workspace/useWorkspaceState.ts`
- `src/app/workspace/useWorkspaceDerivedState.ts`
- `src/app/workspace/useWorkspaceCommands.ts`
- `src/app/workspace/useWorkspaceViewModel.ts`
- `src/app/workspace/createWorkspaceContexts.ts`
- `src/app/workspace/contexts/**`
- `src/app/commands/**`
- `src/interface/context/**`

Settings/integrations:

- `src/features/settings/SettingsPage.tsx`
- `src/features/settings/settingsTypes.ts`
- `src/features/settings/sections/generation-api/**`
- `src/features/settings/sections/integrations/**`
- `src/domain/integrations.ts`
- `src/infrastructure/integrations/**`

Dynamic loading and registries:

- `src/interface/registry/**`
- `src/interface/placements/**`
- `src/features/**/definition.ts`
- `src/shared/features/features.config.ts`
- `src/shared/i18n/registry.ts`
- `src/shared/i18n/locales/**`

Infrastructure/services:

- `src/infrastructure/api.ts`
- `src/processes/storage-sync/**`
- `src/infrastructure/storage/**`

## Highest-Leverage Refactor Targets

1. Provider manifest discovery: remove manual provider imports and allow provider-owned settings/surfaces/resources.
2. Generation param logical discovery: make `param.ts`, `definition.ts`, and placement co-owned by each field folder.
3. ComfyUI workflow plugin manifests: one plugin equals one module; no central type/options/payload/UI edits.
4. Settings slice registry: tabs/subtabs/context/actions discovered from settings feature contributions.
5. Workspace slice registry: state/derived/commands/context contributions instead of one `WorkspaceState`.
6. Split infrastructure clients and inject transport/provider submit builders.
