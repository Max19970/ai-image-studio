# Comfy/local stage 03 preflight

## Цель этапа

Заменить плоский выбор модели на provider → model picker, чтобы пользователь явно выбирал сначала провайдера, затем модель внутри него. Это нужно до ComfyUI, потому что локальные checkpoint-модели будут принадлежать конкретному ComfyUI provider endpoint.

## Планируемые изменения

- Расширить `src/entities/provider/modelOptions.ts` так, чтобы option хранил `providerId`, `providerName`, `modelId` и мог группироваться по провайдерам.
- Добавить единый доменный UI-компонент `ProviderModelPicker` в `src/entities/provider/ui/`, а не копировать picker в composer и batch.
- Заменить текущий `PopoverSelect` моделей в:
  - `src/features/composer/elements/control-menu/ComposerControlMenuAction.tsx`;
  - `src/features/batch-composer/sections/draft-toolbar/BatchDraftToolbarSection.tsx`.
- Обновить типы composer/batch context, чтобы picker получал и модели, и провайдеры.
- Добавить локализационные ключи для provider/model picker.
- Добавить unit-test на группировку моделей.

## Затрагиваемые файлы

- `src/entities/provider/modelOptions.ts`
- `src/entities/provider/index.ts`
- `src/entities/provider/ui/ProviderModelPicker.tsx`
- `src/entities/provider/ui/ProviderModelPicker.module.css`
- `src/features/composer/ImageComposer.tsx`
- `src/features/composer/composerTypes.ts`
- `src/features/composer/elements/control-menu/ComposerControlMenuAction.tsx`
- `src/features/composer/elements/control-menu/ComposerControlMenu.module.css`
- `src/features/batch-composer/batchComposerTypes.ts`
- `src/features/batch-composer/sections/draft-list/BatchDraftListSection.tsx`
- `src/features/batch-composer/sections/draft-toolbar/BatchDraftToolbarSection.tsx`
- `src/features/batch-composer/sections/draft-toolbar/BatchDraftControlsMenu.module.css`
- `src/shared/i18n/locales/en/composer.json`
- `src/shared/i18n/locales/ru/composer.json`
- `tests/providerModelOptions.test.ts`

## Симуляция результата

- Новый пользовательский сценарий:
  1. Пользователь открывает Control menu.
  2. В блоке модели видит выбранную пару: provider + model.
  3. Открывает picker.
  4. Сначала выбирает provider слева/сверху.
  5. Справа/ниже выбирает модель этого provider.
  6. Picker закрывается, composer/batch draft получает selectedModelId.

- Новый data flow:
  - `StudioSettings.providers/models/selectedModelId` остаются источником правды.
  - `getProviderModelGroups()` строит view model для picker.
  - `ProviderModelPicker` не знает про генерацию, payload, ComfyUI или OpenAI — только provider/model selection.

- Что останется неизменным:
  - Структура `StudioSettings`.
  - Команды `setModel` / `patchDraft({ selectedModelId })`.
  - Настройки моделей и провайдеров.
  - OpenAI-compatible генерация.

- Что будет расширено добавлением, а не редактированием старой логики:
  - Добавляется reusable provider/model picker вместо модификации `PopoverSelect` под доменную логику.
  - Старый `PopoverSelect` остаётся универсальным примитивом для простых списков.

## Debt/architecture gate

- Provider-specific код не протекает в feature UI: да, picker работает с generic providers/models.
- Новые параметры не раздувают общий ImageParams: этап не касается параметров.
- Settings не превращаются в набор if adapterId === ...: этап не касается settings-specific adapter UI.
- Detail page не хардкодит ComfyUI поля: этап не касается деталей.
- Storage сохраняет старые задачи без миграционных поломок: структура settings не меняется.
- Batch/single runner не получают provider-specific ветвления: команды выбора модели остаются прежними.
- CSS локален, без глобальных заплаток: новый CSS-module в owner module.
- Accessibility/keyboard для новых popover/dropdown сохранены: trigger имеет `aria-haspopup`, provider/model кнопки используют focusable buttons, Escape/outside dismiss берёт `FloatingPopover`.

## Нужен ли предварительный рефакторинг

Да, но маленький и локальный: вынести группировку моделей по provider в `modelOptions.ts` и создать один reusable picker. Без этого batch и composer получили бы две почти одинаковые реализации.

## Проверки после этапа

- `npm run build`
- `npm test`
- `npm run verify:static`
- visual smoke для `composer-controls` и `batch-composer`.

## Итоговый статус

Выполнено. Реализация прошла `npm test`, `npm run build`, `npm run verify:static` и visual smoke для composer/batch model picker на desktop/mobile.
