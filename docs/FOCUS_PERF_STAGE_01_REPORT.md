# Focus/performance stage 01 report

Дата: 2026-06-19  
Статус: [x] готово

## Что изменено

- Добавлен общий autosize/focus hook:
  - `src/shared/hooks/useAutosizedTextarea.ts`.
- Добавлен общий media-query hook:
  - `src/shared/hooks/useMediaQuery.ts`.
- Обычный composer prompt теперь использует общий hook:
  - `src/features/composer/sections/prompt/ComposerPromptSection.tsx`.
- Batch draft prompt теперь использует тот же общий hook:
  - `src/features/batch-composer/sections/draft-prompt/BatchDraftPromptSection.tsx`.
- CSS обновлён только локально в feature CSS modules:
  - `src/features/composer/ComposerLayout.module.css`;
  - `src/features/batch-composer/sections/draft-prompt/BatchDraftPromptSection.module.css`.
- Добавлены тесты pure helper расчёта высоты:
  - `tests/autosized-textarea.test.ts`.

## Поведение после этапа

- Без фокуса prompt textarea схлопнута примерно до 1 строки.
- При фокусе обычный composer раскрывается:
  - desktop: минимум 5 строк, максимум 7 строк;
  - mobile: минимум 4 строки, максимум 6 строк.
- Batch draft prompt использует те же лимиты.
- После достижения лимита включается внутренний вертикальный scroll.
- В collapsed состоянии используется `wrap="off"` и compact overflow, чтобы длинный prompt не раздувал layout.
- В focused состоянии используется `wrap="soft"`.

## Debt/architecture gate

- Дублирования autosize-логики больше нет.
- Shared hooks не импортируют app/features/domain/entities/processes/interface/infrastructure.
- Definition/Placement registry не затронут.
- Глобальные CSS-слои не менялись.
- Motion-heavy transitions не добавлены.
- `debt:check` сначала поймал рост `BatchDraftPromptSection.module.css` выше cap 100 строк; CSS был ужат до 98 строк, после чего debt gate прошёл.

## Проверки

- [x] `npm run verify:static`
- [x] `npm test` — 45/45 passed.
- [x] `npm run build`
- [x] `npm run ui:check`
- [x] `npm run motion:check`
- [x] `npm run debt:check`
- [x] Targeted screenshots:
  - desktop/mobile `composer-compact`;
  - desktop/mobile `composer-long-prompt`;
  - desktop/mobile `batch-composer`.
- [x] Focus measurement screenshots:
  - desktop/mobile ordinary composer focused;
  - desktop/mobile batch prompt focused.

## Focus measurements

```json
{
  "desktop-composer-before": { "height": 45, "overflowY": "hidden", "overflowX": "auto", "state": "collapsed", "focused": "false", "wrap": "off" },
  "desktop-composer-focused": { "height": 158, "overflowY": "auto", "overflowX": "hidden", "state": "focused", "focused": "true", "wrap": "soft" },
  "desktop-batch-before": { "height": 45, "overflowY": "hidden", "overflowX": "auto", "state": "collapsed", "focused": "false", "wrap": "off" },
  "desktop-batch-focused": { "height": 121, "overflowY": "hidden", "overflowX": "hidden", "state": "focused", "focused": "true", "wrap": "soft" },
  "mobile-composer-before": { "height": 44, "overflowY": "hidden", "overflowX": "auto", "state": "collapsed", "focused": "false", "wrap": "off" },
  "mobile-composer-focused": { "height": 151, "overflowY": "auto", "overflowX": "hidden", "state": "focused", "focused": "true", "wrap": "soft" },
  "mobile-batch-before": { "height": 44, "overflowY": "hidden", "overflowX": "auto", "state": "collapsed", "focused": "false", "wrap": "off" },
  "mobile-batch-focused": { "height": 151, "overflowY": "auto", "overflowX": "hidden", "state": "focused", "focused": "true", "wrap": "soft" }
}
```

## Ограничения проверки

- Ctrl/Cmd+Enter live-submit не запускался, чтобы не создавать реальный generation request во время визуальной проверки. Кодовый путь сохранён: `onKeyDown={context.actions.handlePromptKeyDown}` остался на ordinary composer textarea.
- Vite warning о JS chunk >500 kB остался без изменений; это относится к будущему этапу bundle/code-splitting feasibility.
