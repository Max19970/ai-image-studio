# Focus/performance stage 01 preflight

Дата: 2026-06-19  
Этап: общий autosize/focus-контракт для prompt textarea

## Цель этапа

Сделать единое поведение prompt textarea в обычном composer и batch draft composer:

- без фокуса поле визуально остаётся компактным, примерно в 1 строку;
- при фокусе поле раскрывается на несколько строк и дальше растёт по содержимому до безопасного лимита;
- длинный prompt после лимита скроллится внутри textarea;
- текущие действия composer, включая Ctrl/Cmd+Enter, очистку prompt и переключение batch draft, не меняются.

## Планируемые изменения

1. Вынести DOM-agnostic расчёт высоты textarea в shared hook:
   - `src/shared/hooks/useAutosizedTextarea.ts`.
2. Вынести повторяющийся `matchMedia('(max-width: 620px)')` в маленький общий hook:
   - `src/shared/hooks/useMediaQuery.ts`.
3. Подключить общий autosize hook в:
   - `src/features/composer/sections/prompt/ComposerPromptSection.tsx`;
   - `src/features/batch-composer/sections/draft-prompt/BatchDraftPromptSection.tsx`.
4. Передавать в hook только UI-метрики:
   - collapsed rows: 1;
   - desktop focused min/max rows: 5/7;
   - mobile focused min/max rows: 4/6.
5. Локально обновить CSS prompt textarea через data-атрибут:
   - `data-prompt-state="collapsed|focused"`.

## Затрагиваемые файлы

- `src/shared/hooks/useAutosizedTextarea.ts` — новый shared hook + pure helper.
- `src/shared/hooks/useMediaQuery.ts` — новый generic hook.
- `src/features/composer/sections/prompt/ComposerPromptSection.tsx` — подключение общего поведения.
- `src/features/batch-composer/sections/draft-prompt/BatchDraftPromptSection.tsx` — подключение общего поведения.
- `src/features/composer/ComposerLayout.module.css` — локальные compact/focus правила.
- `src/features/batch-composer/sections/draft-prompt/BatchDraftPromptSection.module.css` — локальные compact/focus правила.
- `tests/autosized-textarea.test.ts` — проверка pure helper.

## Симуляция результата

- Пустое поле без фокуса: высота 1 строки, placeholder остаётся видимым, composer не раздувается.
- Короткий prompt без фокуса: высота 1 строки, текст не переносит dock/карточку на несколько строк.
- Длинный prompt без фокуса: высота 1 строки, лишний текст не увеличивает layout.
- Длинный prompt в фокусе: textarea раскрывается минимум на 5 строк desktop / 4 строки mobile, максимум 7/6 строк, дальше появляется внутренний scroll.
- Mobile `360×800`: composer не занимает критически много экрана; batch prompt не ломает карточку draft.
- Batch selected draft prompt: переключение draft пересчитывает высоту по новому value, но не создаёт отдельную копию autosize-логики.

## Debt/architecture gate

- Дублирование компонентов: нет, общий shared hook используется в двух feature-компонентах.
- Новые глобальные CSS-правки: нет, только локальные CSS module файлы.
- Рост CSS/TS-файлов сверх debt budgets: ожидаемый рост малый; `BatchDraftPromptSection.module.css` должен остаться ниже cap 100 строк.
- Обход Definition/Placement: нет, placement/registry не меняются.
- Связность feature/shared/process: shared hooks не импортируют feature/domain/app/process/interface.
- Motion/performance риск: нет layout-heavy transitions; высота выставляется напрямую по focus/value.
- Memory lifecycle риск: нет новых persistent ссылок или timers, `matchMedia` listener снимается.
- Accessibility/keyboard риск: textarea остаётся textarea, onKeyDown обычного composer сохраняется, aria/placeholder не меняются.

## Нужен ли предварительный рефакторинг

Да, но маленький: сначала вынос общего autosize и media-query поведения в shared hooks, затем подключение в оба prompt-компонента. Это предотвращает копирование autosize-кода и не создаёт feature-aware shared UI.

## Проверки после этапа

- `npm run build`
- `npm run ui:check`
- `npm run motion:check`
- `npm run debt:check`
- `npm test`
- targeted screenshots: `composer-compact`, `composer-long-prompt`, `batch-composer` на desktop/mobile.

## Итоговый статус

[x] Готово. См. `docs/FOCUS_PERF_STAGE_01_REPORT.md`.
