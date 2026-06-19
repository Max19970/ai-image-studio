# UI Visual Remediation — Stage 9 Windows static checker fix

Дата: 2026-06-19  
База: `image-studio-stage8-reviewer-fixes-fixed.zip`

## Повод

После Stage 8 ревьюер обнаружил Windows-only отказ `npm run verify:static`: `scripts/check-interface-registry.mjs` находил `0 definitions`, потому что checker искал файлы через POSIX-only суффикс `/definition.ts`.

На Windows `path.join(...)` возвращает пути с `\\`, поэтому выражение `file.endsWith('/definition.ts')` не совпадало ни с одним `definition.ts`.

## Preflight / debt gate

- [x] Проблема локализована в инфраструктурном checker-е, а не в interface registry.
- [x] Definition/Placement архитектура не меняется.
- [x] Нужен не UI-fix, а path-normalization в самом checker-е.
- [x] Решение должно быть безопасно для Linux/macOS и Windows.

## Реализация

- [x] Добавлен helper `toPosixPath(file)`.
- [x] `rel(file)` теперь нормализует separators через `toPosixPath(...)`.
- [x] Поиск `definition.ts` теперь использует normalized path: `toPosixPath(file).endsWith('/definition.ts')`.
- [x] Legacy slot runtime check тоже переведён на normalized path.

## Проверки

- [x] `npm run interface:check`
- [x] `npm run verify:static`
- [x] Node smoke-test с Windows-style path strings

## Результат

На Linux checker по-прежнему находит registry корректно:

- `51 definitions`
- `53 placements`
- `38 slots`
- `0 legacy slot runtime files`

Windows-only причина отказа устранена: checker больше не зависит от separator-а в абсолютном пути файла.
