# Stage 02 report — Object URL lifecycle

Дата: 2026-06-19

## Статус

Готово.

## Что изменено

### 1. Composer attachment previews больше не пересоздают URLs без причины

Добавлены:

- `src/shared/image/objectUrlRegistry.ts`
- `src/shared/image/useFileObjectUrls.ts`

Обновлён:

- `src/shared/image/useFlatAttachmentPreviewItems.ts`

Теперь preview URLs создаются по фактическому `File` объекту. Если массив attachments пересобрался, но сами файлы остались теми же, URL переиспользуется. При удалении файла revoke делается только для удалённого `File`, а не для всего набора.

Это особенно полезно для:

- composer attachments;
- batch draft attachments;
- удаления reference из середины списка, когда остальные `File` объекты остаются живыми.

### 2. Snapshot object URLs получили release path

Добавлен:

- `src/domain/generationTaskObjectUrls.ts`

Обновлён:

- `src/app/hooks/useGenerationTaskHistory.ts`

Теперь hook истории задач собирает все текущие `blob:` URLs из task snapshots/images и при изменении `tasks` освобождает только те URL, которые исчезли из истории. Это закрывает сценарии:

- удалить task;
- очистить всю историю;
- заменить текущую историю hydrated persistent-версией без `blob:` previews.

Агрессивный unmount cleanup для task snapshots специально не добавлен: у snapshot URL нет исходного `File`, поэтому в dev/StrictMode их нельзя безопасно пересоздать после artificial cleanup.

### 3. Добавлены тесты

Добавлен файл:

- `tests/object-url-lifecycle.test.ts`

Проверяет:

- registry переиспользует URL для сохранённых file objects;
- registry revoke-ит только удалённые элементы;
- collector задач собирает только browser `blob:` URLs и игнорирует persisted/data URLs.

## Проверки

- `npm test` — 47/47 passed.
- `npm run build` — passed.
- `npm run verify:static` — passed.
- `npm run storage:audit:strict` — passed.
- Targeted screenshots:
  - `composer-attachments`
  - `attachment-preview-modal`
  - `detail`
  - `batch-composer`
  - desktop + mobile
- Targeted screenshot artifact check — passed, 8/8 screenshots.

## Visual check

Скриншоты сохранены в:

- `artifacts/stage-02-visual`

Проверены сценарии:

- desktop/mobile composer attachments;
- desktop/mobile attachment preview modal;
- desktop/mobile detail page;
- desktop/mobile batch composer.

Визуальных регрессий на targeted screenshots не обнаружено.

## Debt gate

- [x] Attachment preview в detail не удалён и не заменён на placeholder.
- [x] `blob:` URL по-прежнему не сохраняются в persistent storage.
- [x] Глобальный mutable singleton не добавлен.
- [x] Storage v2 не усложнён.
- [x] Layer boundaries проходят strict architecture check.

## Остаточные замечания

Vite warning по initial JS chunk остался:

- JS: около `513.54 kB` minified / `140.73 kB gzip`.

Это ожидаемо: stage 2 не занимался code splitting. Этот вопрос оставлен для stage 6 feasibility.
