# Image Studio — UI Structural Redesign Stage 4.2 Preflight

Дата: 2026-06-18  
Статус: preflight approved → implementation in this stage

## Stage 4.2 — Mobile composer one-line command bar

## Зачем

После Stage 4.1 desktop composer стал компактнее, но mobile composer всё ещё ощущается слишком громоздким: prompt находится отдельной высокой зоной, а controls/model/send занимают вторую строку. Для мобильного сценария основной путь должен быть похож на быстрый chat/image prompt input: слева одна кнопка действий, по центру поле промпта, справа кнопка отправки.

Важно: мы не копируем конкретный UI ChatGPT. Берём только interaction principle:

```txt
[ actions ] [ prompt input ] [ send ]
```

и адаптируем его под Image Studio: glass/rounded/dark, attachment tray над prompt, bottom nav safe area, controls bottom sheet.

## Симуляция изменений до кода

### 1. `ComposerActionsSection.tsx`

Текущая структура:

```tsx
<div className={styles.actions}>
  <input ...attachments />
  <input ...mask />
  <div className={styles.actionsLeft}>
    <div className={styles.modelSelect}>...</div>
    <SlotHost slot="composer/tools" />
  </div>
  <div className={styles.actionsRight}>
    <button className={styles.expandButton}>...</button>
    <span className={styles.hint}>...</span>
    <button className={styles.sendButton}>...</button>
  </div>
</div>
```

План:

- не удалять hidden file inputs;
- оставить desktop structure прежней;
- на mobile через CSS сделать `.actions`, `.actionsLeft`, `.actionsRight` `display: contents`, чтобы controls/send стали grid-items общего `.promptRail`;
- скрыть mobile-only лишнее в compact row:
  - desktop model chip;
  - expand button;
  - shortcut hint;
- send button оставить справа;
- controls trigger оставить слева;
- prompt input занимает центр.

Почему не переписываем JSX полностью: текущий placement/slot-contract уже стабилен. Для Stage 4.2 достаточно изменить mobile layout-семантику CSS-ом и добавить недостающий доступ к model внутри controls. Большой JSX rewrite создаст больше риска, чем пользы.

### 2. `ComposerControlMenuAction.tsx`

Проблема: если на mobile скрыть `modelSelect` из строки composer-а, пользователь потеряет быстрый доступ к модели.

План:

- расширить `ComposerActionContext` данными модели:
  - `selectedModel`;
  - `modelOptions`;
  - `changeModel(modelId)`;
- в `MenuContent` добавить compact group `Model`, использующий существующий `PopoverSelect`;
- это не attachments-preview внутри controls, а action/settings control, поэтому не конфликтует с решением: attachments видны над prompt, controls содержат действия/настройки.

Симуляция кода:

```tsx
<PopoverSelect
  value={context.selectedModel?.id ?? ''}
  options={context.modelOptions}
  onChange={context.actions.changeModel}
  ariaLabel={t('composer.model')}
/>
```

### 3. `composerTypes.ts`

Добавить в `ComposerActionContext`:

```ts
selectedModel: GenerationModel | null;
modelOptions: ComposerModelOption[];
actions: {
  changeModel: (modelId: string) => void;
  ...
}
```

Риск: context станет чуть шире, но это обосновано — controls menu теперь является мобильным центром управления composer-а.

### 4. `ImageComposer.tsx`

В `composerActionContext` передать:

```ts
selectedModel,
modelOptions,
actions.changeModel: commands.setModel
```

Дополнительно: mobile one-row должен быть default compact state. `expanded` остаётся только для status/warnings/attachments visibility и не должен создавать вторую controls-строку.

### 5. `ComposerLayout.module.css`

Ключевая mobile-схема:

```css
@media (max-width: 620px) {
  .promptRail {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr) 44px;
    grid-template-areas: "controls prompt send";
    align-items: center;
  }

  .promptWrap { grid-area: prompt; }
  .actions,
  .actionsLeft,
  .actionsRight { display: contents; }
  .toolCluster { grid-area: controls; }
  .sendButton { grid-area: send; }
  .modelSelect,
  .expandButton,
  .hint { display: none; }
}
```

Prompt на mobile должен быть однострочно-компактным по умолчанию:

- min-height около `44px`;
- max-height около `92px`;
- pill-like radius;
- clear button компактный.

Attachment tray остаётся сверху над prompt, как в похожих image/chat interfaces.

### 6. `ComposerControlMenu.module.css`

Добавить стили для model select внутри controls menu:

- `.menuModelSelect`;
- `.menuModelTrigger`;
- `.menuModelPanel`.

На desktop можно оставить model chip рядом с composer-ом; menu model section может быть полезной и на desktop, но чтобы не дублировать лишнее, можно показывать её только mobile через CSS/prop. В рамках Stage 4.2 проще и безопаснее показать её в controls menu на всех размерах, но desktop уже имеет model chip. Поэтому реализация: section есть, но компактная. Если будет визуально лишней на desktop, в отдельном polish можно скрыть desktop-variant.

### 7. `scripts/screenshot.config.mjs`

Новый сценарий не обязателен, потому что `gallery` уже показывает compact composer. Но для точечной проверки добавляем/используем existing:

- `gallery` mobile — compact row;
- `composer-controls` mobile — controls bottom sheet;
- `composer-attachments` mobile — attachment tray над prompt.

Отдельный сценарий можно не добавлять, чтобы не плодить screenshot debt.

## Риск техдолга

### Риск 1: потерять доступ к model selection на mobile

Решение: добавить model select в controls menu context.

### Риск 2: CSS `display: contents` может осложнить accessibility/layout

Решение: применять только на layout containers без собственной семантики. Hidden file inputs остаются внутри `.actions`, но это не должно ломать доступность, так как они trigger'ятся кнопками меню.

### Риск 3: controls menu станет слишком тяжёлым

Решение: attachments previews в controls не добавлять. Только actions/settings rows.

### Риск 4: desktop composer случайно изменится

Решение: все one-line изменения ограничить `@media (max-width: 620px)`.

### Риск 5: prompt auto-resize конфликтует с compact mobile input

Решение: ограничить mobile max-height и оставить resize через existing hook. Это сохраняет компактный старт и допускает рост при длинном prompt.

## Нужен ли предварительный рефакторинг

Да, минимальный поддерживающий рефакторинг нужен:

1. Расширить `ComposerActionContext`, чтобы controls menu мог управлять model selection без прямого импорта composer layout state.
2. Сохранить file input ownership в `ComposerActionsSection`, не переносить inputs в menu.
3. Не создавать отдельный mobile composer component — это преждевременное дублирование.

## Implementation checklist

- [ ] Расширить `ComposerActionContext` selected model/model options/change model.
- [ ] Передать model data/action из `ImageComposer` в `composerActionContext`.
- [ ] Добавить model control в `ComposerControlMenuAction`.
- [ ] Перестроить mobile CSS composer-а в одну строку: controls / prompt / send.
- [ ] Скрыть mobile compact model chip/expand/hint.
- [ ] Сохранить attachments tray над prompt.
- [ ] Проверить controls bottom sheet на mobile.
- [ ] Проверить composer attachments state.
- [ ] Обновить roadmap Stage 4.2.
- [ ] `npm run build`.
- [ ] `npm run verify:static`.
- [ ] Visual smoke: mobile gallery, mobile controls, mobile attachments, desktop gallery.

## Definition of Done

- Mobile composer compact state занимает одну строку controls/prompt/send.
- Attachments отображаются сверху над prompt.
- Controls menu остаётся action/settings center, без previews вложений.
- Model selection доступен на mobile.
- Desktop composer не деградировал.
- Проверки зелёные, visual smoke выполнен.
