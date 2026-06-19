# Stage 5.1 — Detail/composer layout bugfix preflight

**Статус:** `[x]` preflight завершён  
**Тип:** corrective stage после Stage 5  
**Причина:** визуальная проверка пользователем выявила layout-регрессии после Stage 4.2/5.

---

## Зачем

Перед продолжением к Settings нужно закрыть регрессии главного рабочего flow:

- composer на desktop оставил слишком много вторичных controls рядом с prompt, из-за чего prompt занимает только часть доступной ширины;
- gallery tile status конфликтует с quick actions;
- detail inspector визуально есть, но его содержимое не получает собственную scroll-зону;
- detail topbar потерял мягкую rounded-форму;
- detail page должна вести себя как fixed artwork stage + scrollable inspector, а не как обычная длинная страница.

Если это оставить, следующий этап будет строиться поверх уже сломанной layout-семантики.

---

## Симуляция изменений

### 1. Composer prompt width

**Файл:** `src/features/composer/sections/actions/ComposerActionsSection.tsx`

Сейчас actions-секция содержит:

```tsx
<div className={styles.modelSelect}>...</div>
<SlotHost slot="composer/tools" ... />
<button className={styles.expandButton}>...</button>
<span className={styles.hint}>...</span>
<button className={styles.sendButton}>...</button>
```

Это противоречит Stage 4.1: controls menu уже содержит model/mode/params/batch/assets. Поэтому visible model select и expand button превращаются в новый шум.

**Будет:**

```tsx
<div className={styles.actionsLeft}>
  <SlotHost slot="composer/tools" ... />
</div>
<div className={styles.actionsRight}>
  <button className={styles.sendButton}>...</button>
</div>
```

**Удаляем из visible composer row:**

- inline model select;
- expand/collapse button;
- keyboard hint.

**Почему это не техдолг:** модель, параметры, batch и assets уже доступны через `composer/tools` → `ComposerControlMenuAction`. Мы не удаляем capability, а убираем дублирующий внешний вход.

**Файл:** `src/features/composer/ComposerLayout.module.css`

Будет удалён/ослаблен visible footprint старых классов `.modelSelect`, `.expandButton`, `.hint`. Layout остаётся один: prompt занимает `1fr`, actions — только compact controls + send.

---

### 2. Gallery status conflict

**Файл:** `src/features/gallery/sections/card-result/GalleryResultCardSection.tsx`

Сейчас status pill показывается для `failed` task даже когда сама placeholder-карточка уже пишет “Ошибка”. Это создаёт дубль и конфликтует с quick actions.

**Будет:**

```tsx
const shouldShowStatusPill = activeImage?.kind === 'partial' || !isTerminalGenerationStatus(task.status);
```

То есть:

- failed/succeeded/cancelled не получают floating status badge;
- pending/running/streaming/retrying продолжают показывать статус;
- partial image продолжает получать badge.

**Файл:** `src/features/gallery/ResultsGallery.module.css`

Floating status переедет в левый верхний угол, чтобы не конфликтовать с quick actions справа.

---

### 3. Detail page fixed stage + scrollable inspector

**Файлы:**

- `src/features/detail/ImageDetailPage.module.css`
- `src/features/detail/sections/hero/DetailHeroSection.module.css`
- `src/features/detail/sections/request-drawer/DetailRequestDrawerSection.module.css`
- `src/shared/ui/SideInspector/SideInspector.module.css`

**Сейчас:** workspace растёт по содержимому, inspector visually sticky, но body не получает гарантированную высоту и scroll. Поэтому нижние sections отрезаются.

**Будет desktop layout:**

```css
.page { height: 100dvh; overflow: hidden; }
.shell { height: 100%; display: flex; flex-direction: column; }
.workspace { flex: 1; min-height: 0; align-items: stretch; }
.stageColumn, .inspectorColumn { min-height: 0; height: 100%; }
```

Hero:

```css
.heroWrap, .heroCard { height: 100%; min-height: 0; }
.heroCard { display: grid; grid-template-rows: minmax(0, 1fr) auto auto; }
.imageStage { min-height: 0; height: 100%; }
.singleImage { max-height: 100%; }
```

Inspector:

```css
.inspector { height: 100%; min-height: 0; }
```

Shared `SideInspector` станет flex-column primitive:

```css
.inspector { display: flex; flex-direction: column; min-height: 0; }
.body { flex: 1; min-height: 0; overflow: auto; }
```

**Почему нужен shared-refactor:** проблема scroll body относится не только к detail. Любой будущий inspector/editor будет ломаться так же, если body не flex-scroll. Исправлять только detail CSS локальным overflow-hack — накопление техдолга.

---

### 4. Detail topbar rounded corners

**Файл:** `src/features/detail/sections/topbar/DetailTopbarSection.module.css`

Сейчас используется `border-radius: var(--radius-pill)`, но такого token нет в `base.css`. Это делает оформление нестабильным.

**Будет:**

```css
border-radius: var(--radius-lg);
overflow: hidden;
```

Также `wrap={false}` будет передан в `CommandBar`, чтобы header не превращался в рыхлую прямоугольную строку.

---

## Риск техдолга и решение

### Риск: удалить controls из composer и потерять функциональность

Не делаем. Удаляем только визуальные дубликаты. Все действия остаются в `ComposerControlMenuAction`.

### Риск: сделать detail desktop fixed-height и сломать mobile scroll

Desktop fixed-height включается только для `min-width: 981px`. На tablet/mobile layout остаётся page-scroll.

### Риск: сделать локальный overflow hack внутри detail inspector

Не делаем. Сначала улучшается shared primitive `SideInspector`, затем detail задаёт корректную высоту.

### Риск: убрать все статусы из gallery tile

Не делаем. Убираем только terminal-status badges, которые дублируют placeholder/не нужны на готовых карточках. Live/pending/partial status сохраняется.

---

## Checklist

- [x] Сформулировать bugfix как Stage 5.1, а не как хаотичные правки.
- [x] Проверить текущие composer/detail/gallery owners.
- [x] Запланировать shared-refactor `SideInspector`.
- [x] Сохранить command/slot architecture без новых hardcoded flows.
- [x] Убрать inline model/expand/hint из composer row.
- [x] Исправить gallery terminal status badge.
- [x] Сделать desktop detail fixed artwork stage + scrollable inspector.
- [x] Исправить detail topbar radius.
- [x] Обновить roadmap.
- [x] Запустить `npm run build`.
- [x] Запустить static checks.
- [ ] Снять visual smoke screenshots для gallery/composer/detail.

---

## Definition of Done

- Prompt в composer занимает основную ширину строки.
- Quick actions в gallery не конфликтуют со статусом.
- Detail inspector прокручивается сам, без отрезанных sections.
- Detail image stage занимает оставшуюся высоту viewport на desktop.
- Detail topbar снова имеет мягкие rounded corners.
- Desktop и mobile detail layouts не мешают друг другу.
