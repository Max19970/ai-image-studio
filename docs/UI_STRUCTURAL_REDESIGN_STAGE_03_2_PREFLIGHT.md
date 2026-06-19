# Image Studio — UI Structural Redesign Stage 3.2 Preflight

Дата: 2026-06-18  
Статус: preflight завершён, реализация выполняется после этого документа

## Цель

Stage 3.1 доказал, что contextual inspector для Gallery конфликтует с главной задачей экрана: быстро просматривать изображения. Постоянный inspector сжимает Image Wall, overlay inspector перекрывает изображения, hover-driven inspector создаёт лишнее состояние и риск reflow/пересчётов. Поэтому Stage 3.2 переводит Gallery в более чистую модель:

```txt
Image Wall + minimal tile badges + explicit quick actions menu + details page for all metadata
```

Gallery больше не показывает подробные metadata локально. Все подробности остаются на Detail page.

---

## Симуляция изменений

### 1. Удаление gallery inspector state из `ResultsGallery`

**Было по смыслу:**

```tsx
const [inspectionState, setInspectionState] = useState<GalleryInspectionState | null>(null);
const inspectionTarget = resolveGalleryInspectionTarget(archiveResult.tasks, inspectionState);
const inspection = {
  target: inspectionTarget,
  openPeek: (...),
  closePeek: (...)
};
const context = { tasks, busy, commands, archive, inspection };
```

**Станет:**

```tsx
const context: GalleryLayoutContext = { tasks: archiveResult.tasks, busy, commands, archive };
```

Также reset/deleteFiltered больше не будут закрывать inspector, потому что inspector state исчезает.

**Почему:** inspector был page-level состоянием без самостоятельной пользы после UX-решения убрать его.

**Риск техдолга:** низкий, потому что удаляется лишний state, а не добавляется новый.

---

### 2. Удаление `galleryInspection` model

**Удаляется файл:**

```txt
src/features/gallery/model/galleryInspection.ts
```

**Почему удаляется:** после отказа от inspector нет consumer'ов для `GalleryInspectionState` / `resolveGalleryInspectionTarget`.

**Риск техдолга:** низкий; оставлять файл было бы хуже, потому что он закреплял бы мёртвую UX-гипотезу в доменной модели Gallery.

---

### 3. Упрощение gallery context contracts

**В `src/interface/context/workspace/gallery.ts` удаляется:**

```ts
GalleryInspectionTarget
GalleryInspectionControls
GalleryLayoutContext.inspection
GalleryTaskCardContext.peeked
GalleryTaskCardContext.onPeekTask
```

**В `GalleryCardActionContext` добавляется:**

```ts
onOpenTask: (image?: GeneratedImage) => void;
```

**Почему:** quick actions menu должен уметь открыть detail page, но не должен знать о Gallery page state. Открытие деталей уже существует как command, поэтому action context получает только callback.

**Риск техдолга:** умеренный, если добавить callback только в один компонент напрямую. Поэтому callback добавляется в существующий action context, а не протаскивается ad-hoc через несколько новых типов.

---

### 4. Удаление inspector placement и section

**Из `src/interface/placements/gallery.layout.placement.ts` удаляется:**

```ts
{
  id: 'gallery.layout.inspector',
  slot: 'gallery/inspector',
  use: 'gallery.sections.inspector'
}
```

**Удаляется папка:**

```txt
src/features/gallery/sections/inspector/
```

**Почему:** inspector больше не является частью Gallery layout.

**Риск техдолга:** низкий; dead placement хуже, чем удаление.

---

### 5. Добавление quick actions slot

**Добавляется placement:**

```ts
{
  id: 'gallery.card.quick-actions',
  slot: 'gallery/card-quick-actions',
  use: 'gallery.sections.quickActions',
  order: 10
}
```

**Добавляется definition:**

```txt
src/features/gallery/sections/quick-actions/definition.ts
src/features/gallery/sections/quick-actions/GalleryQuickActionsSection.tsx
src/features/gallery/sections/quick-actions/GalleryQuickActionsSection.module.css
```

**Поведение:**

- trigger `⋯` показывается в tile overlay;
- desktop открывает `FloatingPopover` рядом с кнопкой;
- mobile открывает `BottomSheet`;
- menu содержит `Open details`, `Download`, `Delete`;
- menu не показывает prompt/provider/model/params — это остаётся на Detail page.

**Почему:** quick actions — это action pattern, а не information pattern. Он не перекрывает смысл Gallery так сильно, как inspector.

**Риск техдолга:** умеренный, если действия будут захардкожены внутри tile. Поэтому действия кладутся в отдельный slot `gallery/card-menu-actions`; сам quick actions component только создаёт оболочку и добавляет базовое `Open details`.

---

### 6. Миграция существующих actions в menu slot

**`gallery.card-actions.placement.ts` меняется с overlay delete на menu delete:**

```ts
slot: 'gallery/card-menu-actions'
use: 'gallery.deleteTask'
props: { presentation: 'menuItem', labelKey: 'gallery.actionDelete', fullWidth: true }
```

**`gallery.card-footer-actions.placement.ts` меняется с overlay download на menu download:**

```ts
slot: 'gallery/card-menu-actions'
use: 'imageActions.downloadImage'
props: {
  labelKey: 'gallery.actionDownload',
  presentation: 'button',
  variant: 'ghost',
  size: 'compact',
  fullWidth: true
}
```

**Почему:** download/delete больше не должны висеть отдельными плашками поверх изображения. Они остаются доступны в quick actions.

**Риск техдолга:** низкий; мы переиспользуем существующие action definitions вместо создания дубликатов.

---

### 7. Обновление action definitions без копипасты

`DeleteGalleryTaskAction` расширяется props:

```ts
presentation?: 'icon' | 'menuItem';
labelKey?: string;
fullWidth?: boolean;
```

`DownloadImageAction` расширяется props:

```ts
fullWidth?: boolean;
```

**Почему:** один definition может использоваться и как icon overlay, и как menu item. Это соответствует placement-driven архитектуре.

**Риск техдолга:** низкий; это не новая сущность, а расширение presentation mode уже существующего reusable action.

---

### 8. Изменение tile sections

**В `GalleryResultCardSection` и `GalleryPlaceholderCardSection`:**

- удалить `openPeek`;
- удалить info button `i`;
- удалить `peekedTile` класс;
- добавить SlotHost:

```tsx
<SlotHost<GalleryCardActionContext>
  slot="gallery/card-quick-actions"
  context={{ task, activeImage, galleryIndex: index, onOpenTask: context.onOpenTask, onDeleteTask: context.onDeleteTask }}
  as={null}
/>
```

**Почему:** tile остаётся минимальным, а actions живут в отдельном action menu.

---

### 9. CSS cleanup

Из `GalleryTileSection.module.css` удаляется:

- `.peekedTile` selectors;
- `.infoButton`;
- overlay rules для отдельных download/delete links.

Добавляется CSS только для generic overlay container, а стили самого quick menu живут в `quick-actions` section module.

**Почему:** CSS должен принадлежать владельцу компонента, а не расползаться по общей tile stylesheet.

---

### 10. i18n cleanup

Удаляются/перестают использоваться inspector keys:

```txt
gallery.inspectorTitle
gallery.inspectorDescription
gallery.peekInfo
gallery.closeInspector
...
```

Добавляются keys:

```txt
gallery.quickActions
gallery.quickActionsDescription
gallery.quickActionsOpen
gallery.actionOpenDetails
gallery.actionDownload
gallery.actionDelete
```

---

## Необходимый рефакторинг перед основной задачей

Да, нужен небольшой поддерживающий рефакторинг:

1. Сначала убрать `inspection` из context contract и `ResultsGallery`.
2. Затем удалить inspector placement/section/model.
3. Затем добавить action context callback `onOpenTask`.
4. Только после этого добавлять quick actions slot.

Если сделать наоборот, получится временная двойная модель: Gallery одновременно знает и про inspector state, и про quick actions. Это ухудшит архитектуру и оставит мёртвые связи.

---

## Definition of Done

- Gallery не содержит inspector state.
- Нет `gallery/inspector` placement.
- Нет `GalleryInspectorSection` и `galleryInspection.ts`.
- Tile click по изображению открывает Detail page.
- Tile quick actions открываются только по явной кнопке `⋯`.
- Desktop quick actions используют popover, mobile — bottom sheet.
- Download/delete/details доступны из quick actions.
- `npm run verify:static` зелёный.
- Визуально проверены gallery default и gallery quick actions на desktop/mobile.
