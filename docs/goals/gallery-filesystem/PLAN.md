# Gallery Filesystem Implementation Plan

**Intent:** Add a first-class gallery filesystem where saved generations and folders are gallery items with a logical path, and the gallery renders a usable explorer instead of a flat task wall.
**Current Behavior:** The gallery archive treats `GenerationTask[]` as the only gallery content. Filtering, actions, and grid slots are task-centric; new server runs are inserted into the root-like flat history.
**Expected Outcome:** The server persists a logical path string on generation tasks, the frontend derives/owns an active gallery path, folders appear as gallery items next to generation tasks, and new single/batch generations created while browsing a path are inserted into that active path.
**Target-Perspective Output:** Max can create folders, enter/leave folders through breadcrumbs, see folders and generations together, open/delete/move items, and send new generations into the currently active folder without manual sorting.
**Truth Owner:** `GenerationTask.galleryPath` is the source of truth for generation placement; persisted `GalleryFolder` descriptors are the source of truth for empty/user-created folders. Frontend explorer state owns the currently active path.
**Contract Boundary:** Storage/API exchange task/folder path metadata as plain strings; UI consumes abstract `GalleryItem` objects and does not assume every tile is a generation task.
**Cutover:** Replace gallery grid/content flow from task-only rendering to item rendering. Keep generation card implementation as one `GalleryItem` renderer; add folder as another renderer.
**Displaced Path:** Direct `context.tasks.map(...)` rendering in gallery grid is demoted to `context.items.map(...)`; task-only archive model becomes filesystem-aware archive/model.
**Value Density:** First slice gives real folder creation, breadcrumb navigation, path-aware generation placement, task/folder deletion, and tests without introducing a real server directory tree.
**Acceptance Evidence:** Unit tests for archive/filesystem behavior; type/build pass; visual screenshot runner for gallery/mobile if environment permits.
**Evidence Lane:** `npm test`, `npm run build`, targeted screenshot runner for `gallery` desktop/mobile.
**Kill Criteria:** No permanent duplicate task-only gallery grid path; no folder-as-generation-task fake objects; no generation creation path silently defaulting to root while a folder is active.
**Architecture Slice:** Domain path helpers + folder descriptor; storage codecs/API for paths/folders; workspace state for active path; gallery archive producing `GalleryItem[]`; tile renderers for task/folder.
**Plan Review Gate:** Self PRE review before execution and POST review before final report.

## Architecture Map

Files to create:
- `src/domain/galleryFilesystem.ts`
- `src/features/gallery/model/galleryItems.ts`
- `src/features/gallery/sections/folder-card/GalleryFolderCardSection.tsx`
- `src/features/gallery/sections/folder-card/definition.ts`
- `src/features/gallery/sections/filesystem/GalleryExplorerBar.tsx`
- `src/features/gallery/sections/filesystem/GalleryExplorerBar.module.css`
- `server/storage/gallery-folders/*` if separate folder persistence is needed
- `tests/gallery-filesystem.test.ts`

Files to modify:
- `src/domain/generationTask.ts`
- `src/entities/storage/generationTasks.ts`
- `server/processes/generationTaskRuntime.ts`
- `server/routes/generationRoutes.ts`
- `server/storage/generation-tasks/*`
- `src/infrastructure/api.ts`
- `src/app/workspace/*`
- `src/app/commands/*`
- `src/interface/context/*`
- `src/features/gallery/*`
- `src/shared/i18n/locales/*/gallery.json`

Files to avoid:
- Provider adapters except where request transport already accepts metadata.
- Existing image-detail behavior except path metadata display/opening if necessary.

Read path:
1. Server loads tasks/folders with path metadata.
2. Frontend normalizes tasks/folders.
3. Gallery archive resolves the active directory into abstract items.
4. Grid routes each item to the correct item renderer.

Write path:
1. User changes active path through explorer.
2. Single/batch submit sends `galleryPath` with request.
3. Server creates task with that path and persists it.
4. Folder create/delete/move updates folder descriptors and, for moves, affected task/folder paths.

## Checklist

### [x] Stage 1 — Contracts and plan files
- Define path normalization rules: root is `"/"`, folder paths are slash-delimited absolute strings, no empty segments, no `.`/`..`.
- Add domain types for folders and abstract gallery items.
- Risk check: avoid making folders fake tasks.

### [x] Stage 2 — Storage and server path metadata
- Add `galleryPath?: string` to generation task documents and SQL rows/index if useful.
- Normalize legacy tasks to root.
- Add server-side path metadata to single/batch run creation.
- Risk check: migration must be backward-compatible.

### [x] Stage 3 — Folder persistence API
- Persist user-created folders separately from task documents so empty folders survive.
- Add create/delete/move/update APIs and client store helpers.
- Risk check: folder path/name uniqueness is enforced by normalized item id/path.

### [x] Stage 4 — Workspace active path and generation placement
- Add active path state to workspace.
- Pass active path into single and batch submission.
- Ensure new generations are created in the current path.
- Risk check: batch must remain provider-independent.

### [x] Stage 5 — Gallery archive refactor to abstract items
- Build `GalleryItem` list from folders + tasks for the active path.
- Keep filters/search/sort meaningful for task items and folder names.
- Replace task-only grid context with item context.
- Risk check: no duplicate grid path remains.

### [x] Stage 6 — Explorer UI and folder actions
- Add breadcrumb/path header, create-folder control, folder tiles, enter/delete/move actions.
- Keep layout compact and consistent with current gallery style.
- Risk check: avoid bulky dashboard/table feel.

### [x] Stage 7 — Tests and checks
- Add unit tests for path normalization, item resolution, and active-path placement payloads.
- Run `npm test` and `npm run build`.
- Risk check: failing existing storage/generation tests must be addressed, not ignored.

### [~] Stage 8 — Visual QA, reviews, Telegram + final report
- Run gallery desktop/mobile screenshots if Chromium/server allows it.
- Perform POST self-review for ownership, cutover, duplicate paths, and evidence.
- Send final Telegram report before final chat answer.
