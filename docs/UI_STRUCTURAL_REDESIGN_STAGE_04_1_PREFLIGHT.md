# UI Structural Redesign — Stage 4.1 Preflight

Дата: 2026-06-18  
Статус: реализовано и проверено

## Название этапа

**Stage 4.1 — Composer Controls Consolidation + Flat Attachments**

## Зачем

После Stage 4 composer стал легче, но всё ещё содержит несколько отдельных icon-popover controls: mode, assets, batch, parameters. Это возвращает ощущение панели приборов и заставляет пользователя угадывать назначение маленьких иконок.

Новый целевой flow:

```txt
[ attachments tray, only if images exist ]
[ prompt input ] [ model ] [ controls ] [ generate ]
```

Вложения должны оставаться видимыми в composer над полем промпта. Controls popover не должен показывать thumbnails или attachment-preview; он должен быть меню действий.

## UX-решение

- В composer остаётся одна controls-кнопка.
- В controls menu находятся только действия:
  - переключить режим generation/edit;
  - добавить изображения;
  - очистить вложения, если они есть;
  - открыть параметры генерации;
  - открыть batch composer.
- Вложения отображаются сверху composer-а, над prompt input.
- UI больше не использует термины `исходник`/`референс` в основном composer flow. `Маска` остаётся отдельным advanced control, потому что это реальная provider-level возможность edit API.
- Добавление вложений происходит через один multi-file picker.
- Новые вложения хранятся как flat image list, но без рискованной немедленной миграции всей domain-модели.

## Симуляция изменений по файлам

### `src/features/composer/ImageComposer.tsx`

**Было:**

- три input-а через refs: `targetRef`, `refsRef`, `maskRef`;
- attachment preview строится через `useAttachmentPreviewItems({ targetImage, referenceImages, mask })`;
- edit-mode и warning завязаны на `targetImage`;
- secondary surface содержит attachments + status.

**Станет:**

- один input ref: `attachmentsRef`;
- новые пользовательские файлы добавляются в `referenceImages` как flat list;
- `targetImage`/`mask` остаются только legacy state, если они уже попали из старого состояния/старых flows;
- preview строится как flat image list через новый helper;
- attachments slot рендерится внутри `commandSurface` перед prompt rail;
- secondary surface остаётся только для status;
- controls action получает `openAttachmentPicker` вместо target/reference/mask picker methods.

### `src/features/composer/composerTypes.ts`

**Было:**

- `ComposerActionContext.fileInputs` содержит `target`, `references`, `mask`;
- actions содержат `openTargetPicker`, `openReferencePicker`, `openMaskPicker`;
- layout actions содержат `addReferences`, `setTargetImage`, `setMask`.

**Станет:**

- `fileInputs.attachments`;
- actions: `openAttachmentPicker`, `clearAttachments`, `setMode`, `openBatchComposer`, `openParameters`;
- layout actions: `addAttachments`, `removeAttachment`;
- legacy target/reference setters не прокидываются в UI context, чтобы новый composer не продолжал поощрять source/reference terminology. Mask setter прокидывается отдельно как advanced action.

### `src/features/composer/sections/actions/ComposerActionsSection.tsx`

**Было:**

- hidden inputs для target/reference/mask;
- `SlotHost` для `composer/tools`, где рендерятся несколько action icons.

**Станет:**

- один hidden multi-file input `accept="image/png,image/jpeg,image/webp" multiple`;
- `SlotHost` рендерит один controls action;
- model select остаётся рядом с controls;
- expand button остаётся только для status/secondary раскрытия, не для вложений.

### `src/features/composer/elements/control-menu/*`

**Добавить:**

- `ComposerControlMenuAction.tsx`;
- `ComposerControlMenu.module.css`;
- `definition.ts`.

Внутри:

- одна кнопка controls;
- desktop: `FloatingPopover`;
- mobile: `BottomSheet`;
- список действий без thumbnails;
- mode switch как segmented/two action rows внутри меню;
- action rows для attachments, params, batch, clear.

### Старые composer action elements

**Удалить:**

- `assets-action/*`;
- `mode-action/*`;
- `batch-action/*`;
- `parameters-action/*`;
- `ActionIconButton.*`, если после удаления он нигде не используется.

Причина: после перехода на один controls menu эти definitions станут мёртвыми. Оставлять их в glob-based registry нельзя: они будут продолжать грузиться как доступные definitions и увеличивать путаницу вокруг composer action model.

### `src/interface/placements/composer.tools.placement.ts`

**Было:** четыре placement-а: mode/assets/batch/parameters.

**Станет:** один placement:

```ts
{
  id: 'composer.tools.controls',
  slot: 'composer/tools',
  use: 'composer.controlsAction',
  order: 10
}
```

### `src/shared/image/attachmentPreviewTypes.ts`

**Изменить:** добавить role `'image'` для flat composer previews.

### `src/shared/image/useAttachmentPreviewItems.ts`

**Добавить:** flat-preview helper, который строит items с role `image` и labels `image 1`, `image 2`, ...

Старый `useAttachmentPreviewItems` оставить для detail/batch legacy flows до отдельного batch/detail этапа.

### `src/shared/ui/AttachmentImageStrip/*`

**Изменить:**

- role `image` получает neutral badge `IMG`/`ИЗОБР`;
- attachment preview modal показывает нейтральные тексты для flat image;
- target/ref/mask стили сохраняются для history/detail/batch.

### `src/app/workspace/useWorkspaceDerivedState.ts`

**Изменить:**

- edit-mode warning/canSubmit проверяют наличие любого image attachment: `targetImage || referenceImages.length > 0 || mask`;
- старый ключ warning можно переиспользовать или заменить на более нейтральный текст.

### `src/processes/batch-runner/requestBuilder.ts`

**Изменить аккуратно:**

- batch draft в edit-mode считается валидным при наличии любого image attachment;
- это нужно, чтобы переход в batch из нового flat composer не создавал невалидную очередь.

### `src/shared/i18n/locales/*/composer.json`, `attachment.json`, возможно `app.json/gallery.json/info.json/batch.json`

**Изменить:**

- убрать target/ref/mask terminology из main composer strings;
- добавить `composer.controls`, `composer.addImages`, `composer.imagesAttached`, `composer.editNeedsImage`, `composer.modeGenerateDescription`, `composer.modeEditDescription`.

### `scripts/screenshot.config.mjs`

**Изменить:**

- сценарии `parameters`, `batch-composer`, `composer-edit-status` сначала открывают controls menu;
- добавить/обновить сценарий `composer-controls`.

## Анализ риска техдолга

### Риск 1: domain-модель всё ещё хранит `targetImage/referenceImages/mask`

Полная миграция domain-модели затронула бы composer, batch, snapshots, storage, detail, request preview и provider contracts. Это слишком широкий refactor для Stage 4.1 и смешал бы UI consolidation с data migration.

**Решение:**

- в main composer UI перейти на flat attachments;
- новые файлы хранить в `referenceImages` как совместимый flat bucket;
- legacy `targetImage/mask` не показывать как отдельные роли, а отображать в tray как обычные изображения, если они уже есть;
- полноценную domain migration вынести в отдельный технический этап после detail/batch redesign, если она всё ещё будет нужна.

### Риск 2: мёртвые action definitions в glob registry

Если оставить старые definitions, registry будет продолжать грузить `composer.modeAction`, `composer.assetsAction`, etc. Это создаст ложную доступность старой модели.

**Решение:** удалить старые action folders после добавления нового `composer.controlsAction`.

### Риск 3: mobile popover вместо sheet

Один floating popover на touch-экране будет тесным и неудобным.

**Решение:** controls action рендерит `FloatingPopover` для desktop и `BottomSheet` для mobile через CSS/media gating, без дублирования бизнес-логики.

## Definition of Done

- [x] В composer есть одна controls-кнопка вместо набора mode/assets/batch/params icons.
- [x] Вложения отображаются над prompt input, не внутри controls menu.
- [x] Добавление обычных изображений — один multi-file picker.
- [x] PNG-маска добавляется/заменяется отдельной кнопкой в controls menu.
- [x] Main composer UI не использует target/reference terminology; mask оставлена как отдельный advanced control.
- [x] Edit-mode валиден при наличии любого изображения или маски.
- [x] Parameters и batch открываются из controls menu.
- [x] Старые action definitions удалены или перестали участвовать в registry.
- [x] Screenshot runner обновлён под новый controls flow.
- [x] `npm run verify:static` зелёный.
- [x] desktop/mobile screenshots сняты для gallery, composer controls, composer attachments, composer mask, composer edit-status, parameters, batch.

## Amendment после уточнения пользователя: маска остаётся отдельным advanced control

Перед внедрением пользователь уточнил, что поддержку маски нужно сохранить. Это меняет не основную модель flat image attachments, а границу ответственности:

- обычные изображения остаются flat attachments и отображаются сверху composer-а над prompt;
- controls popover остаётся меню действий и не показывает thumbnails;
- PNG-маска не смешивается с обычным `images[]` bucket в UI-семантике;
- для маски добавляется отдельная кнопка `Добавить маску` / `Заменить маску` внутри controls menu;
- если маска есть, controls menu также даёт точечное действие `Убрать маску`;
- в верхнем attachment tray маска может отображаться как специальный attachment с badge `MASK`, потому что пользователь должен видеть активную маску и иметь возможность удалить её;
- добавление обычных изображений больше не сбрасывает уже выбранную маску;
- общий action `Очистить вложения` очищает и изображения, и маску.

### Дополнительная симуляция изменений

#### `ImageComposer.tsx`

- добавить отдельный `maskRef` рядом с `attachmentsRef`;
- прокинуть `fileInputs.mask` в `ComposerActionContext`;
- добавить `setMaskAttachment(file)` и `clearMask()`;
- `addAttachments(files)` больше не вызывает `commands.setMask(null)`, чтобы добавление изображений не уничтожало маску;
- flat preview list строится из обычных изображений с role `image` и маски с role `mask`.

#### `composerTypes.ts`

- добавить `hasMask` в `ComposerActionContext`;
- добавить `fileInputs.mask`;
- добавить actions `setMask`, `clearMask`, `openMaskPicker`.

#### `ComposerActionsSection.tsx`

- добавить hidden `<input type="file" accept="image/png">` для маски;
- при выборе маски вызывать `context.actionContext.actions.setMask(file)`.

#### `ComposerControlMenuAction.tsx`

- добавить action row `Добавить маску` / `Заменить маску`;
- если маска есть, добавить отдельный row `Убрать маску`;
- не добавлять preview маски в controls menu.

#### `useAttachmentPreviewItems.ts`

- расширить flat preview helper возможностью указать role/label на item, чтобы обычные изображения оставались нейтральными `image`, а маска отображалась как `mask` без возврата target/reference семантики.

### Почему это не ухудшает архитектуру

Маска остаётся отдельной provider-level возможностью OpenAI-compatible edit flow и не превращается в обычную картинку. Это сохраняет честную модель:

- `images[]` — обычные входные изображения, которые модель учитывает по prompt;
- `mask` — специальный optional control для API, если provider поддерживает маску;
- composer UI не возвращается к source/reference разделению;
- controls menu остаётся меню действий, а не вложенным attachment inspector.
