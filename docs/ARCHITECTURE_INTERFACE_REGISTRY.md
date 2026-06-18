# Interface registry inventory

This document records the Stage 4 definition/placement state. It is intentionally generated from the current source tree shape and kept human-readable for migration work.

## Summary

- Definitions: **55**
- Placements: **61**
- Slots: **40**
- Reusable definitions used by multiple placements: **5**
- Active legacy slot runtime files: **0**

Check this inventory with:

```bash
npm run interface:check
```

## Slots

- `batch-composer/controls` — 1 placement(s)
- `batch-composer/draft/attachments` — 1 placement(s)
- `batch-composer/draft/card` — 1 placement(s)
- `batch-composer/draft/header` — 1 placement(s)
- `batch-composer/draft/mode` — 1 placement(s)
- `batch-composer/draft/prompt` — 1 placement(s)
- `batch-composer/draft/toolbar` — 1 placement(s)
- `batch-composer/drafts` — 1 placement(s)
- `batch-composer/footer` — 1 placement(s)
- `batch-composer/header` — 1 placement(s)
- `composer/actions` — 1 placement(s)
- `composer/attachments` — 1 placement(s)
- `composer/input` — 1 placement(s)
- `composer/status` — 1 placement(s)
- `composer/tools` — 4 placement(s)
- `detail/actions` — 5 placement(s)
- `detail/hero` — 1 placement(s)
- `detail/request-drawer` — 1 placement(s)
- `detail/topbar` — 1 placement(s)
- `gallery/card` — 2 placement(s)
- `gallery/card-actions` — 1 placement(s)
- `gallery/card-footer-actions` — 1 placement(s)
- `gallery/content` — 2 placement(s)
- `gallery/header` — 1 placement(s)
- `gallery/header-actions` — 3 placement(s)
- `settings/active-section` — 1 placement(s)
- `settings/content` — 1 placement(s)
- `settings/header` — 1 placement(s)
- `settings/layout` — 1 placement(s)
- `settings/save-actions` — 2 placement(s)
- `settings/save-bar` — 1 placement(s)
- `settings/sections` — 4 placement(s)
- `settings/tab-navigation` — 1 placement(s)
- `settings/tabs` — 2 placement(s)
- `sidebar/footer-tabs` — 1 placement(s)
- `sidebar/main-tabs` — 2 placement(s)
- `workspace/dock` — 1 placement(s)
- `workspace/main` — 4 placement(s)
- `workspace/modals` — 2 placement(s)
- `workspace/sidebar` — 1 placement(s)

## Reusable definitions

- `imageActions.downloadImage` — 2 placements
- `navigation.workspaceTab` — 3 placements
- `settings.tab` — 2 placements
- `settingsSections.generationApi` — 2 placements
- `settingsSections.interface` — 2 placements

## Placements

| Placement id | Slot | Definition | Source |
| --- | --- | --- | --- |
| `batchComposer.layout.header` | `batch-composer/header` | `batchComposer.sections.header` | `src/interface/placements/batch-composer.layout.placement.ts` |
| `batchComposer.layout.controls` | `batch-composer/controls` | `batchComposer.sections.controls` | `src/interface/placements/batch-composer.layout.placement.ts` |
| `batchComposer.layout.draftList` | `batch-composer/drafts` | `batchComposer.sections.draftList` | `src/interface/placements/batch-composer.layout.placement.ts` |
| `batchComposer.layout.footer` | `batch-composer/footer` | `batchComposer.sections.footer` | `src/interface/placements/batch-composer.layout.placement.ts` |
| `batchComposer.draft.card` | `batch-composer/draft/card` | `batchComposer.sections.draftCard` | `src/interface/placements/batch-composer.layout.placement.ts` |
| `batchComposer.draft.header` | `batch-composer/draft/header` | `batchComposer.sections.draftHeader` | `src/interface/placements/batch-composer.layout.placement.ts` |
| `batchComposer.draft.mode` | `batch-composer/draft/mode` | `batchComposer.sections.draftMode` | `src/interface/placements/batch-composer.layout.placement.ts` |
| `batchComposer.draft.prompt` | `batch-composer/draft/prompt` | `batchComposer.sections.draftPrompt` | `src/interface/placements/batch-composer.layout.placement.ts` |
| `batchComposer.draft.attachments` | `batch-composer/draft/attachments` | `batchComposer.sections.draftAttachments` | `src/interface/placements/batch-composer.layout.placement.ts` |
| `batchComposer.draft.toolbar` | `batch-composer/draft/toolbar` | `batchComposer.sections.draftToolbar` | `src/interface/placements/batch-composer.layout.placement.ts` |
| `composer.layout.attachments` | `composer/attachments` | `composer.sections.attachments` | `src/interface/placements/composer.layout.placement.ts` |
| `composer.layout.prompt` | `composer/input` | `composer.sections.prompt` | `src/interface/placements/composer.layout.placement.ts` |
| `composer.layout.actions` | `composer/actions` | `composer.sections.actions` | `src/interface/placements/composer.layout.placement.ts` |
| `composer.layout.status` | `composer/status` | `composer.sections.status` | `src/interface/placements/composer.layout.placement.ts` |
| `composer.tools.mode` | `composer/tools` | `composer.modeAction` | `src/interface/placements/composer.tools.placement.ts` |
| `composer.tools.assets` | `composer/tools` | `composer.assetsAction` | `src/interface/placements/composer.tools.placement.ts` |
| `composer.tools.batch` | `composer/tools` | `composer.batchAction` | `src/interface/placements/composer.tools.placement.ts` |
| `composer.tools.parameters` | `composer/tools` | `composer.parametersAction` | `src/interface/placements/composer.tools.placement.ts` |
| `detail.actions.download-image` | `detail/actions` | `imageActions.downloadImage` | `src/interface/placements/detail.actions.placement.ts` |
| `detail.actions.copy-prompt` | `detail/actions` | `detail.copyPrompt` | `src/interface/placements/detail.actions.placement.ts` |
| `detail.actions.copy-payload` | `detail/actions` | `detail.copyPayload` | `src/interface/placements/detail.actions.placement.ts` |
| `detail.actions.copy-params` | `detail/actions` | `detail.copyParams` | `src/interface/placements/detail.actions.placement.ts` |
| `detail.actions.load-composer` | `detail/actions` | `detail.loadComposer` | `src/interface/placements/detail.actions.placement.ts` |
| `detail.layout.topbar` | `detail/topbar` | `detail.sections.topbar` | `src/interface/placements/detail.layout.placement.ts` |
| `detail.layout.hero` | `detail/hero` | `detail.sections.hero` | `src/interface/placements/detail.layout.placement.ts` |
| `detail.layout.request-drawer` | `detail/request-drawer` | `detail.sections.requestDrawer` | `src/interface/placements/detail.layout.placement.ts` |
| `gallery.card.delete-task` | `gallery/card-actions` | `gallery.deleteTask` | `src/interface/placements/gallery.card-actions.placement.ts` |
| `gallery.card-footer.download-image` | `gallery/card-footer-actions` | `imageActions.downloadImage` | `src/interface/placements/gallery.card-footer-actions.placement.ts` |
| `gallery.header.clear-results` | `gallery/header-actions` | `gallery.clearResults` | `src/interface/placements/gallery.header-actions.placement.ts` |
| `gallery.header.history-link` | `gallery/header-actions` | `gallery.historyLink` | `src/interface/placements/gallery.header-actions.placement.ts` |
| `gallery.header.result-count` | `gallery/header-actions` | `gallery.resultCount` | `src/interface/placements/gallery.header-actions.placement.ts` |
| `gallery.layout.header` | `gallery/header` | `gallery.sections.header` | `src/interface/placements/gallery.layout.placement.ts` |
| `gallery.layout.empty` | `gallery/content` | `gallery.sections.empty` | `src/interface/placements/gallery.layout.placement.ts` |
| `gallery.layout.grid` | `gallery/content` | `gallery.sections.grid` | `src/interface/placements/gallery.layout.placement.ts` |
| `gallery.card.placeholder` | `gallery/card` | `gallery.sections.placeholderCard` | `src/interface/placements/gallery.layout.placement.ts` |
| `gallery.card.result` | `gallery/card` | `gallery.sections.resultCard` | `src/interface/placements/gallery.layout.placement.ts` |
| `settings.layout.root` | `settings/layout` | `settingsLayout.root` | `src/interface/placements/settings.layout.placement.ts` |
| `settings.layout.header` | `settings/header` | `settingsLayout.header` | `src/interface/placements/settings.layout.placement.ts` |
| `settings.layout.save-bar` | `settings/save-bar` | `settingsLayout.saveBar` | `src/interface/placements/settings.layout.placement.ts` |
| `settings.layout.tab-navigation` | `settings/tab-navigation` | `settingsLayout.tabNavigation` | `src/interface/placements/settings.layout.placement.ts` |
| `settings.layout.active-section` | `settings/active-section` | `settingsLayout.activeSection` | `src/interface/placements/settings.layout.placement.ts` |
| `settings.layout.desktop-content` | `settings/content` | `settingsLayout.desktopContent` | `src/interface/placements/settings.layout.placement.ts` |
| `settings.save-actions.reset-changes` | `settings/save-actions` | `settings.resetChanges` | `src/interface/placements/settings.save-actions.placement.ts` |
| `settings.save-actions.save-changes` | `settings/save-actions` | `settings.saveChanges` | `src/interface/placements/settings.save-actions.placement.ts` |
| `settings.sections.interface.desktop` | `settings/sections` | `settingsSections.interface` | `src/interface/placements/settings.sections.placement.ts` |
| `settings.sections.interface.mobile` | `settings/sections` | `settingsSections.interface` | `src/interface/placements/settings.sections.placement.ts` |
| `settings.sections.generation-api.desktop` | `settings/sections` | `settingsSections.generationApi` | `src/interface/placements/settings.sections.placement.ts` |
| `settings.sections.generation-api.mobile` | `settings/sections` | `settingsSections.generationApi` | `src/interface/placements/settings.sections.placement.ts` |
| `settings.tabs.interface` | `settings/tabs` | `settings.tab` | `src/interface/placements/settings.tabs.placement.ts` |
| `settings.tabs.generation-api` | `settings/tabs` | `settings.tab` | `src/interface/placements/settings.tabs.placement.ts` |
| `sidebar.footer.settings-tab` | `sidebar/footer-tabs` | `navigation.workspaceTab` | `src/interface/placements/sidebar.footer-tabs.placement.ts` |
| `sidebar.main.images-tab` | `sidebar/main-tabs` | `navigation.workspaceTab` | `src/interface/placements/sidebar.main-tabs.placement.ts` |
| `sidebar.main.info-tab` | `sidebar/main-tabs` | `navigation.workspaceTab` | `src/interface/placements/sidebar.main-tabs.placement.ts` |
| `workspace.sidebar.default` | `workspace/sidebar` | `workspace.sidebar` | `src/interface/placements/workspace.layout.placement.ts` |
| `workspace.main.gallery` | `workspace/main` | `workspace.galleryPage` | `src/interface/placements/workspace.layout.placement.ts` |
| `workspace.main.batch-composer` | `workspace/main` | `workspace.batchComposerPage` | `src/interface/placements/workspace.layout.placement.ts` |
| `workspace.main.info` | `workspace/main` | `workspace.infoPage` | `src/interface/placements/workspace.layout.placement.ts` |
| `workspace.main.settings` | `workspace/main` | `workspace.settingsPage` | `src/interface/placements/workspace.layout.placement.ts` |
| `workspace.dock.composer` | `workspace/dock` | `workspace.composerDock` | `src/interface/placements/workspace.layout.placement.ts` |
| `workspace.modals.single-parameters` | `workspace/modals` | `workspace.singleParametersModal` | `src/interface/placements/workspace.layout.placement.ts` |
| `workspace.modals.batch-parameters` | `workspace/modals` | `workspace.batchParametersModal` | `src/interface/placements/workspace.layout.placement.ts` |

## Definitions

| Definition id | Source |
| --- | --- |
| `batchComposer.sections.controls` | `src/features/batch-composer/sections/controls/definition.ts` |
| `batchComposer.sections.draftAttachments` | `src/features/batch-composer/sections/draft-attachments/definition.ts` |
| `batchComposer.sections.draftCard` | `src/features/batch-composer/sections/draft-card/definition.ts` |
| `batchComposer.sections.draftHeader` | `src/features/batch-composer/sections/draft-header/definition.ts` |
| `batchComposer.sections.draftList` | `src/features/batch-composer/sections/draft-list/definition.ts` |
| `batchComposer.sections.draftMode` | `src/features/batch-composer/sections/draft-mode/definition.ts` |
| `batchComposer.sections.draftPrompt` | `src/features/batch-composer/sections/draft-prompt/definition.ts` |
| `batchComposer.sections.draftToolbar` | `src/features/batch-composer/sections/draft-toolbar/definition.ts` |
| `batchComposer.sections.footer` | `src/features/batch-composer/sections/footer/definition.ts` |
| `batchComposer.sections.header` | `src/features/batch-composer/sections/header/definition.ts` |
| `composer.assetsAction` | `src/features/composer/elements/assets-action/definition.ts` |
| `composer.batchAction` | `src/features/composer/elements/batch-action/definition.ts` |
| `composer.modeAction` | `src/features/composer/elements/mode-action/definition.ts` |
| `composer.parametersAction` | `src/features/composer/elements/parameters-action/definition.ts` |
| `composer.sections.actions` | `src/features/composer/sections/actions/definition.ts` |
| `composer.sections.attachments` | `src/features/composer/sections/attachments/definition.ts` |
| `composer.sections.prompt` | `src/features/composer/sections/prompt/definition.ts` |
| `composer.sections.status` | `src/features/composer/sections/status/definition.ts` |
| `detail.copyParams` | `src/features/detail/elements/copy-params/definition.ts` |
| `detail.copyPayload` | `src/features/detail/elements/copy-payload/definition.ts` |
| `detail.copyPrompt` | `src/features/detail/elements/copy-prompt/definition.ts` |
| `detail.loadComposer` | `src/features/detail/elements/load-composer/definition.ts` |
| `detail.sections.hero` | `src/features/detail/sections/hero/definition.ts` |
| `detail.sections.requestDrawer` | `src/features/detail/sections/request-drawer/definition.ts` |
| `detail.sections.topbar` | `src/features/detail/sections/topbar/definition.ts` |
| `gallery.clearResults` | `src/features/gallery/elements/clear-results/definition.ts` |
| `gallery.deleteTask` | `src/features/gallery/elements/delete-task/definition.ts` |
| `gallery.historyLink` | `src/features/gallery/elements/history-link/definition.ts` |
| `gallery.resultCount` | `src/features/gallery/elements/result-count/definition.ts` |
| `gallery.sections.placeholderCard` | `src/features/gallery/sections/card-placeholder/definition.ts` |
| `gallery.sections.resultCard` | `src/features/gallery/sections/card-result/definition.ts` |
| `gallery.sections.empty` | `src/features/gallery/sections/empty/definition.ts` |
| `gallery.sections.grid` | `src/features/gallery/sections/grid/definition.ts` |
| `gallery.sections.header` | `src/features/gallery/sections/header/definition.ts` |
| `imageActions.downloadImage` | `src/features/image-actions/elements/download-image/definition.ts` |
| `navigation.workspaceTab` | `src/features/navigation/elements/workspace-tab/definition.ts` |
| `settings.resetChanges` | `src/features/settings/elements/reset-settings/definition.ts` |
| `settings.saveChanges` | `src/features/settings/elements/save-settings/definition.ts` |
| `settings.tab` | `src/features/settings/elements/settings-tab/definition.ts` |
| `settingsLayout.activeSection` | `src/features/settings/sections/active-section/definition.ts` |
| `settingsLayout.desktopContent` | `src/features/settings/sections/desktop-content/definition.ts` |
| `settingsSections.generationApi` | `src/features/settings/sections/generation-api/definition.ts` |
| `settingsSections.interface` | `src/features/settings/sections/interface/definition.ts` |
| `settingsLayout.root` | `src/features/settings/sections/layout-root/definition.ts` |
| `settingsLayout.header` | `src/features/settings/sections/page-heading/definition.ts` |
| `settingsLayout.saveBar` | `src/features/settings/sections/save-bar/definition.ts` |
| `settingsLayout.tabNavigation` | `src/features/settings/sections/tab-navigation/definition.ts` |
| `workspace.batchComposerPage` | `src/features/workspace/sections/batch-composer/definition.ts` |
| `workspace.batchParametersModal` | `src/features/workspace/sections/batch-parameters-modal/definition.ts` |
| `workspace.composerDock` | `src/features/workspace/sections/composer-dock/definition.ts` |
| `workspace.galleryPage` | `src/features/workspace/sections/gallery/definition.ts` |
| `workspace.infoPage` | `src/features/workspace/sections/info/definition.ts` |
| `workspace.settingsPage` | `src/features/workspace/sections/settings/definition.ts` |
| `workspace.sidebar` | `src/features/workspace/sections/sidebar/definition.ts` |
| `workspace.singleParametersModal` | `src/features/workspace/sections/single-parameters-modal/definition.ts` |
