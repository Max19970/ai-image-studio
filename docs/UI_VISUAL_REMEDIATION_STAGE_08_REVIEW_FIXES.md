# UI Visual Remediation — Stage 08 Reviewer Fixes

Дата: 19 июня 2026 года  
База: `image-studio-finalqa-fixed.zip`

## Цель

Закрыть три хвоста, найденные ревьюером после финальной приёмки:

1. мобильный compact composer с длинным prompt раздувался выше целевого compact-диапазона;
2. batch composer оставлял визуально неубедительную пустоту после формы, особенно между footer и mobile bottom navigation;
3. действия detail-экрана на `360px` сжимались в три колонки и почти упирались в край.

## Preflight / debt gate

- [x] Проверить, можно ли исправить проблемы локальными owner-level правками.
- [x] Не добавлять новые placement/definition без необходимости.
- [x] Не разносить mobile-specific CSS по чужим модулям.
- [x] Не увеличивать общий технический долг ради визуальных фиксов.

Итог: отдельный архитектурный рефакторинг не нужен. Все изменения локальны для composer, batch composer, detail hero, shell/mobile-layer и screenshot runner.

## Реализация

### 1. Long prompt в mobile compact composer

Файлы:

- `src/features/composer/sections/prompt/ComposerPromptSection.tsx`
- `src/features/composer/ComposerLayout.module.css`
- `scripts/capture-app.mjs`
- `scripts/screenshot.config.mjs`
- `package.json`

Изменения:

- mobile compact textarea теперь остаётся one-line до явного expanded-state;
- autosize на mobile compact ограничен `44px`, expanded-state сохраняет прежний рост;
- для compact textarea используется `wrap="off"`, чтобы длинный prompt не переносился в несколько строк;
- добавлен screenshot-сценарий `composer-long-prompt`;
- screenshot runner получил `scenario.seedParams`, чтобы сценарий мог явно задавать длинный prompt;
- `verify:visual` и `visual:check` теперь включают `composer-long-prompt`.

### 2. Batch composer empty space

Файлы:

- `src/features/batch-composer/MultiImageComposer.module.css`
- `src/styles/layers/app-shell.css`
- `src/styles/layers/mobile.css`
- `src/features/workspace/StudioSidebar.module.css`

Изменения:

- desktop batch composer вертикально центрируется в рабочей области, вместо ощущения формы, брошенной в верхнюю часть экрана;
- при открытом batch composer desktop больше не наследует нижний padding, предназначенный для обычного composer dock;
- на mobile batch composer скрывает bottom navigation и обнуляет `--mobile-bottom-nav-space`, потому что экран уже имеет явную кнопку возврата в галерею;
- mobile stage теперь завершается после footer без дополнительного padding под hidden navigation.

### 3. Detail actions на 360px

Файл:

- `src/features/detail/sections/hero/DetailHeroSection.module.css`

Изменения:

- на `max-width: 380px` action bar переходит в две колонки;
- primary action занимает отдельную полную строку;
- secondary/download и copy menu остаются во второй строке;
- nowrap больше не давит primary action в край.

## Проверки

- [x] `npm run verify:static`
- [x] `npm run debt:check:strict`
- [x] targeted screenshot capture:
  - [x] `narrowMobile × composer-long-prompt`
  - [x] `narrowMobile × batch-composer`
  - [x] `narrowMobile × detail`
  - [x] `desktop × composer-long-prompt`
  - [x] `desktop × batch-composer`
  - [x] `desktop × detail`
- [x] screenshot artifact check: 6/6 files.

## Результат

Ревьюерские пункты №1, №14 и №18 закрыты. Новых архитектурных исключений не добавлено.
