# Component migration map

Stage 2 removed the legacy `src/components` layer. The old files were moved into either reusable shared primitives or their owning feature modules.

## Shared UI and image helpers

| Old path | New path | Why |
| --- | --- | --- |
| `src/components/FloatingPopover.tsx` | `src/shared/ui/FloatingPopover/FloatingPopover.tsx` | Reusable positioning primitive. |
| `src/components/PopoverSelect.tsx` | `src/shared/ui/PopoverSelect/PopoverSelect.tsx` | Reusable select primitive built on FloatingPopover. |
| `src/components/AttachmentImageStrip.tsx` | `src/shared/ui/AttachmentImageStrip/AttachmentImageStrip.tsx` | Reusable attachment preview strip used by composer and batch composer. |
| `src/components/AttachmentPreviewModal.tsx` | `src/shared/ui/AttachmentImageStrip/AttachmentPreviewModal.tsx` | Internal modal for the shared attachment strip. |
| `src/components/attachmentTypes.ts` | `src/shared/image/attachmentPreviewTypes.ts` | Shared attachment preview type used by UI and hooks. |
| `src/components/composer/useAttachmentPreviewItems.ts` | `src/shared/image/useAttachmentPreviewItems.ts` | Shared object URL lifecycle and attachment preview item builder. |

## Feature-owned components

| Old path | New path | Owner |
| --- | --- | --- |
| `src/components/ImageComposer.tsx` | `src/features/composer/ImageComposer.tsx` | Composer feature. |
| `src/components/composer/composerTypes.ts` | `src/features/composer/composerTypes.ts` | Composer feature context types. |
| `src/components/composer/ActionIconButton.tsx` | `src/features/composer/ui/ActionIconButton.tsx` | Composer-only action button. |
| `src/components/MultiImageComposer.tsx` | `src/features/batch-composer/MultiImageComposer.tsx` | Batch composer feature. |
| `src/components/MultiImageComposer.module.css` | `src/features/batch-composer/MultiImageComposer.module.css` | Batch composer local styles. |
| `src/components/batch-composer/batchComposerTypes.ts` | `src/features/batch-composer/batchComposerTypes.ts` | Batch composer feature context types. |
| `src/components/ResultsGallery.tsx` | `src/features/gallery/ResultsGallery.tsx` | Gallery feature. |
| `src/components/ResultsGallery.module.css` | `src/features/gallery/ResultsGallery.module.css` | Gallery local styles. |
| `src/components/gallery/GallerySlotElements.tsx` | `src/features/gallery/elements/shared/GallerySlotElements.tsx` | Gallery feature elements. |
| `src/components/ImageDetailPage.tsx` | `src/features/detail/ImageDetailPage.tsx` | Detail feature. |
| `src/components/ImageDetailPage.module.css` | `src/features/detail/ImageDetailPage.module.css` | Detail local styles. |
| `src/components/detail/sentParameters.ts` | `src/features/detail/sentParameters.ts` | Detail request formatting helper. |
| `src/components/SettingsPage.tsx` | `src/features/settings/SettingsPage.tsx` | Settings feature. |
| `src/components/SettingsPage.module.css` | `src/features/settings/SettingsPage.module.css` | Settings local styles. |
| `src/components/ParameterPanel.tsx` | `src/features/parameters/ParameterPanel.tsx` | Generation parameters feature. |
| `src/components/ParameterPanel.module.css` | `src/features/parameters/ParameterPanel.module.css` | Parameters local styles. |
| `src/components/ParametersModal.tsx` | `src/features/parameters/ParametersModal.tsx` | Generation parameters feature. |
| `src/components/ParametersModal.module.css` | `src/features/parameters/ParametersModal.module.css` | Parameters modal local styles. |
| `src/components/StudioInfoPage.tsx` | `src/features/workspace/StudioInfoPage.tsx` | Workspace info page. |
| `src/components/StudioSidebar.tsx` | `src/features/workspace/StudioSidebar.tsx` | Workspace shell/navigation. |
| `src/components/StudioSidebar.module.css` | `src/features/workspace/StudioSidebar.module.css` | Workspace sidebar local styles. |

## Verification

Stage 2 verification:

```bash
npm run build
npm run arch:check
```

The architecture baseline was regenerated after migration and now contains zero active violations.
