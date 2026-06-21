# Request Presets Plan

## Product shape

Presets are compact reusable request snapshots. The composer exposes presets from the existing Controls menu instead of adding another bottom-bar button. The manager opens as a dedicated desktop dialog or mobile bottom sheet and feels like a quick palette: save current setup, search/scan saved presets, apply, edit, delete.

Batch uses the same preset manager UI and snapshot model. Applying a preset to a batch draft replaces only that draft configuration, preserving batch independence.

## Architecture

- Entity: `entities/request-presets` owns preset types, normalization, creation, update helpers, and compatibility-safe snapshot shape.
- Storage: `infrastructure/storage/localRequestPresetStore.ts`, `remoteRequestPresetStore.ts`, plus `processes/storage-sync/requestPresets.ts` follow existing app document storage conventions.
- App state: workspace state hydrates presets once and persists changes after hydration.
- Commands: preset commands live in app command layer and expose save/apply/update/delete for composer and apply-to-draft for batch.
- UI: preset picker/editor is one shared request-presets feature component opened from mono Controls and selected batch draft Controls.

## Checklist

- [x] Stage 0 — inspect current workspace, storage, composer, batch and interface registry ownership.
- [x] Stage 1 — add domain entity and local/remote storage for presets.
- [x] Stage 2 — add workspace state and command contracts.
- [x] Stage 3 — implement composer preset panel UI with save/apply/edit/delete.
- [x] Stage 4 — wire batch draft preset application without global coupling.
- [x] Stage 5 — add i18n strings and styles near components.
- [x] Stage 6 — run build/static checks.
- [x] Stage 7 — run visual QA for desktop/mobile composer and batch scenarios.

## Acceptance notes

- Applying a preset restores prompt, params, provider-specific params, selected model, and provider mode.
- If a preset references a deleted model, the app falls back safely and shows a compatibility notice instead of breaking.
- Presets do not store uploaded `File` attachments in this stage; this is intentional because current attachment state is runtime-only.
