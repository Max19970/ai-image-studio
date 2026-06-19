# Stage 02 preflight — Object URL lifecycle

Дата: 2026-06-19

## Цель этапа

Сократить лишнее создание `blob:` object URLs для attachment previews и закрыть release-path для preview URLs, которые попадают в request snapshots текущей сессии.

## Найденные пути данных

### Composer attachments

Путь:

1. `ImageComposer.tsx` / `BatchDraftCardSection.tsx` собирают `flatImages` из `targetImage`, `referenceImages`, `mask`.
2. `useFlatAttachmentPreviewItems.ts` превращает их в `AttachmentPreviewItem[]`.
3. `AttachmentImageStrip` и `AttachmentPreviewModal` показывают `previewUrl`.

До этапа 2:

- `useFlatAttachmentPreviewItems()` создавал `URL.createObjectURL()` для каждого элемента при каждом изменении массива `images`.
- Cleanup revocation был только для полного массива из предыдущего эффекта.
- При удалении одного файла, смене порядка или пересборке массива могли пересоздаваться URL для файлов, которые фактически остались теми же `File` объектами.

### Request snapshot attachments

Путь:

1. `captureRequestSnapshot()` вызывает `summarizeAttachments()`.
2. `summarizeFile()` создаёт `URL.createObjectURL(file)` и кладёт его в `AttachmentSummary.previewUrl`.
3. Detail page показывает эти previews через `DetailSnapshotSections -> AttachmentImageStrip`.
4. Persistent storage уже отбрасывает `blob:` URL при sanitize, поэтому в storage их сохранять нельзя и не нужно.

До этапа 2:

- Snapshot preview URLs оставались жить в памяти до конца сессии, даже если task удалён или history очищена.
- Storage v2 менять не требовалось: слой `entities/storage/generationTasks.ts` уже не пропускает `blob:` URL в persisted task snapshots.

## Симуляция изменений

### Изменение A — registry для composer object URLs

Планируемое изменение:

- добавить маленький registry `createObjectUrlRegistry()` в `shared/image`;
- хранить URL по идентичности `File` объекта, а не по индексу/reference id;
- при reconcile создавать URL только для новых `File` объектов;
- revoke делать только для файлов, которых больше нет в текущем composer наборе;
- на unmount composer/draft release all.

Проверка на техдолг:

- глобального singleton нет;
- storage не затрагивается;
- registry инкапсулирован и имеет явный release API;
- shared layer не импортирует app/features/entities/processes.

Вердикт: безопасно.

### Изменение B — collector/revoker для task snapshot object URLs

Планируемое изменение:

- добавить domain utility, которая умеет собрать `blob:` URL из `GenerationTask` / `GenerationRequestSnapshot`;
- в `useGenerationTaskHistory()` держать set текущих task object URLs;
- при изменении `tasks` revoke делать только для URL, которые исчезли из task history;
- не делать aggressive unmount cleanup для task snapshots, чтобы не сломать detail previews в dev/StrictMode, где URL-строки нельзя пересоздать без исходных `File`.

Проверка на техдолг:

- domain utility работает только с domain types;
- app hook остаётся владельцем lifecycle state;
- task/storage architecture не усложняется;
- persistent storage по-прежнему фильтрует `blob:` URL.

Вердикт: безопасно.

## Риски и ограничения

- Live generation request не запускался в рамках stage 2, чтобы не отправлять реальные API-запросы.
- Detail preview после реальной генерации зависит от snapshot URLs, поэтому они освобождаются только когда task исчез из `tasks`, а не сразу после завершения запроса.
- Full bundle warning Vite остаётся тем же классом проблемы и относится к будущему stage 6, не к object URL lifecycle.

## Acceptance targets

- Composer attachments preview визуально не меняется.
- Batch draft attachments preview визуально не меняется.
- Attachment preview modal открывается как раньше.
- Detail attachment previews остаются доступны, пока task есть в истории текущей сессии.
- Удаление/clear task освобождает snapshot `blob:` URLs.
- Storage audit подтверждает отсутствие проблем persistent storage.
