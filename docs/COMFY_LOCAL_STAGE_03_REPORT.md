# Comfy/local stage 03 report

## Статус

Выполнено.

## Что изменено

- Добавлен reusable provider/model picker в `src/entities/provider/ui/ProviderModelPicker.tsx`.
- `src/entities/provider/modelOptions.ts` расширен до provider-aware view model:
  - `ProviderModelOption` хранит provider metadata;
  - `ProviderModelGroup` группирует модели по провайдерам;
  - добавлены helpers для selected model/provider и fallback-групп.
- Плоский model dropdown заменён на provider → model picker в:
  - `ComposerControlMenuAction`;
  - `BatchDraftToolbarSection`.
- Trigger выбранной модели теперь показывает и модель, и провайдера.
- Desktop picker использует `FloatingPopover` с двухпанельной компоновкой.
- Mobile picker использует `BottomSheet` с компактным provider rail и списком моделей.
- Добавлены i18n-ключи для provider/model picker.
- Добавлены screenshot scenarios:
  - `composer-model-picker`;
  - `batch-model-picker`.

## Architecture/debt notes

- `PopoverSelect` не удалялся и остался универсальным primitive для простых select-like сценариев.
- Новый picker не является composer-only: он находится в owner module `entities/provider/ui` и используется и в single composer, и в batch draft toolbar.
- Структура settings не менялась: source of truth по-прежнему `providers`, `models`, `selectedModelId`.
- Provider-specific логика ComfyUI не добавлялась. Picker работает с generic provider/model entities.
- Settings active model selector не менялся на этом этапе, чтобы не смешивать composer/batch action UX с настройками.

## Проверки

```txt
npm test
```

Результат: 62 passed, 0 failed.

```txt
npm run build
```

Результат: passed.

```txt
npm run verify:static
```

Результат: passed.

```txt
npm run capture:screenshots -- --viewports=desktop,mobile --scenarios=composer-controls,composer-model-picker,batch-composer-controls,batch-model-picker --out=artifacts/stage03-visual
```

Результат: 8 completed, 0 failed.

## Visual check

Проверены сценарии:

- desktop composer controls;
- desktop composer model picker;
- desktop batch composer controls;
- desktop batch model picker;
- mobile composer controls;
- mobile composer model picker;
- mobile batch composer controls;
- mobile batch model picker.

На desktop picker читается как двухпанельный provider → model popover.
На mobile picker открывается поверх action sheet как вложенный BottomSheet. Это допустимо для текущего этапа, но при будущей полировке можно заменить на inline-expansion внутри уже открытого controls sheet, если вложенные sheets будут ощущаться тяжеловато.

## Chromium policy note

Для visual smoke временно снимался `URLBlocklist` из Chromium managed policy согласно проектному screenshot guide. После проверки policy восстановлена из backup.

## Следующий этап

Этап 4 — compatibility policy при смене provider/model:

- определять capabilities нового provider-а;
- очищать неподдерживаемые вложения при переходе на ComfyUI;
- принудительно возвращать режим в `generate`, если provider не поддерживает edit;
- не чистить лишнее при смене между совместимыми provider-ами.
