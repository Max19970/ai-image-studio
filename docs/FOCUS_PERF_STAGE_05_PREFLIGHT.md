# Focus/performance stage 05 preflight

## Цель этапа

Уменьшить лишний render churn вокруг обычного composer и batch composer без изменения UX, command contract, batch scheduling, storage или provider API.

## Планируемые изменения

1. Стабилизировать event-callback ссылки на границе composer-компонентов:
   - не менять app command contract;
   - не переписывать command factories;
   - использовать маленький hook, который сохраняет актуальный callback через ref и возвращает стабильную функцию для UI events.
2. Вынести часто повторяемый derivation для model options:
   - заменить `providers.find(...)` внутри `models.map(...)` на lookup-table helper;
   - переиспользовать helper в mono composer и batch draft context.
3. Стабилизировать batch composer derived values:
   - `totalImages`;
   - `validDrafts`;
   - `selectedDraftIndex`;
   - `context.actions`.
4. В batch queue вынести отдельный memoized item:
   - при вводе в выбранный draft обновляется изменённый item и selected editor;
   - остальные draft items не должны заново считать prompt/attachment/status labels, если их draft object и selected state не поменялись.
5. Снизить attachment-preview churn:
   - не создавать новый label callback на каждый prompt render;
   - не пересобирать card context больше, чем нужно.

## Затрагиваемые файлы

- `src/shared/hooks/useEventCallback.ts`
- `src/entities/provider/modelOptions.ts`
- `src/features/composer/ImageComposer.tsx`
- `src/features/composer/composerTypes.ts`
- `src/features/batch-composer/MultiImageComposer.tsx`
- `src/features/batch-composer/batchComposerTypes.ts`
- `src/features/batch-composer/sections/draft-list/BatchDraftListSection.tsx`
- `src/features/batch-composer/sections/draft-card/BatchDraftCardSection.tsx`
- `src/features/batch-composer/sections/draft-toolbar/BatchDraftToolbarSection.tsx`
- `tests/model-options.test.ts`

## Симуляция результата

### Mono composer prompt typing

Должны обновляться:

- prompt textarea value/autosize;
- `canSubmit`/warnings/status, если prompt влияет на валидность;
- layout context, потому что он содержит `prompt`.

Не должны без причины пересоздаваться:

- model options;
- attachment label callback;
- composer action callbacks, которые сами по себе не зависят от prompt.

### Batch composer prompt typing

Должны обновляться:

- selected draft prompt textarea;
- selected draft queue item;
- selected editor status pill;
- `validDrafts`/`canSubmit`, если prompt меняет готовность.

Не должны без причины пересчитываться:

- model options for every render;
- queue item labels for unaffected draft objects;
- batch context action function references.

### Batch draft switching

Должно сохраниться:

- выбор draft;
- selected editor;
- toolbar/menu actions;
- params opening for selected draft;
- add/duplicate/remove draft semantics.

## Debt/architecture gate

- Дублирование компонентов: не добавляем новые composer implementations, только helper и memoized queue item внутри существующей section.
- Новые глобальные CSS-правки: нет.
- Рост CSS/TS-файлов сверх debt budgets: проверить `npm run debt:check`.
- Обход Definition/Placement: нет, SlotHost/placements не меняются.
- Связность feature/shared/process: helper для UI event callbacks остаётся в `shared/hooks`; model option helper должен жить не в `shared`, потому что использует domain-типы.
- Motion/performance риск: нет новых анимаций/transition.
- Memory lifecycle риск: нет новых object URL/cache lifecycle.
- Accessibility/keyboard риск: prompt keydown, buttons and popovers должны остаться прежними.

## Нужен ли предварительный рефакторинг

Да, но маленький: общий helper для provider model options нельзя класть в `shared`, потому что `shared -> domain` нарушает dependency direction. Если такая ошибка появится во время реализации, helper должен быть перемещён в `entities/provider` до продолжения этапа.

## Проверки после этапа

- `npm run verify:static`
- targeted screenshots:
  - `composer-long-prompt`
  - `batch-composer`
  - `composer-attachments`
  - desktop/mobile
- screenshot artifact check для targeted scenarios
- ad-hoc browser typing smoke для mono и batch prompt без real API request

## Итоговый статус

Preflight approved. Риск низкий при условии, что изменения останутся локальными и не начнут переписывать command factories/runtime registry.
