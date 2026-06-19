# Comfy/local stage 04 preflight

## Цель этапа

Ввести capability-driven compatibility policy при смене provider/model, чтобы будущий ComfyUI-провайдер не получил старые OpenAI-style edit attachments/mask и не оставил composer/batch в неподдерживаемом режиме.

## Планируемые изменения

- Добавить единый sanitizer для draft-like состояния:
  - `mode`
  - `targetImage`
  - `referenceImages`
  - `mask`
- Применять sanitizer из command-layer, а не из конкретного UI-компонента:
  - single composer model/mode/attachments commands;
  - settings save/select model;
  - batch draft patch/add/duplicate;
  - restore from detail.
- Добавить мягкое notice-сообщение для single composer, когда policy что-то очистила.
- Добавить unit-тесты на сам sanitizer и batch preservation для текущего OpenAI-compatible provider.

## Затрагиваемые файлы

- `src/entities/provider/compatibility.ts`
- `src/app/commands/providerCompatibilityCommands.ts`
- `src/app/commands/createComposerCommands.ts`
- `src/app/commands/createBatchComposerCommands.ts`
- `src/app/commands/createSettingsCommands.ts`
- `src/app/commands/workspaceCommands.ts`
- `src/app/workspace/state/useComposerWorkspaceState.ts`
- `src/app/workspace/useWorkspaceDerivedState.ts`
- `src/shared/i18n/locales/*/composer.json`
- `tests/provider-compatibility.test.ts`

## Симуляция результата

- Новый пользовательский сценарий: пользователь работал в edit-mode с изображениями, затем выбирает модель провайдера, который не поддерживает edit/images/mask. Composer автоматически возвращается в `generate`, изображения и маска очищаются, в статусной зоне появляется короткое notice.
- Новый data flow: provider/model selection command → resolve provider adapter capabilities → sanitizer → state patch.
- Что останется неизменным: OpenAI-compatible generate/edit продолжает работать с теми же вложениями и масками.
- Что будет расширено добавлением, а не редактированием старой логики: новые provider-и будут объявлять capabilities в adapter definition; UI-команды используют общий sanitizer, без `if adapterId === 'comfyui'`.

## Debt/architecture gate

- Provider-specific код не протекает в feature UI: да, feature UI вызывает команды как раньше.
- Новые параметры не раздувают общий ImageParams: да, этап не трогает параметры.
- Settings не превращаются в набор if adapterId === ...: да, settings вызывает capability sanitizer.
- Detail page не хардкодит ComfyUI поля: да, restore использует общий sanitizer.
- Storage сохраняет старые задачи без миграционных поломок: да, snapshot schema не меняется.
- Batch/single runner не получают provider-specific ветвления: да, policy применяется до runner layer.
- CSS локален, без глобальных заплаток: CSS не меняется.
- Accessibility/keyboard для новых popover/dropdown сохранены: UI-компоненты не меняются.

## Нужен ли предварительный рефакторинг

Да, небольшой: вынести sanitizer в `src/entities/provider/compatibility.ts` и command helper в `src/app/commands/providerCompatibilityCommands.ts`, чтобы не раздувать composer/batch/settings команды и не нарушить debt budget.

## Проверки после этапа

- `npm test`
- `npm run build`
- `npm run verify:static`
- Visual smoke: `composer-controls`, `batch-composer-controls` на desktop/mobile.

## Итоговый статус

Готов к реализации.
