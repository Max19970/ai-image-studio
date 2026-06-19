# UI remediation stage 01 preflight

## Цель этапа

Закрыть первый P1-пакет аудита: visual QA должен покрывать актуальный интерфейс, а mobile composer/navigation/overlays/gallery не должны скрывать пользовательский контент или вводить в заблуждение.

## Проблемы из аудита

- #1 P1 — mobile composer и bottom navigation перекрывают слишком много контента.
- #2 P1 — мобильный `×` выглядит как закрытие страницы, но очищает результаты.
- #3 P1 — composer controls перекрывает рабочую область и плохо учитывает viewport.
- #4 P1 — галерея кадрирует изображения через `object-fit: cover`.
- #5 P1 — visual QA обрывается на устаревших сценариях.
- Также частично затрагиваются #12 P2 и #19 P2, потому что они завязаны на тот же mobile overlay/composer контракт.

## Планируемые изменения

1. Visual QA:
   - убрать устаревший сценарий `composer-expanded`, который ищет удалённый `data-testid="composer-expand"`;
   - добавить актуальный сценарий компактного composer на основе существующего `data-composer-expanded`;
   - исправить `attachment-preview-modal`, открывая detail request/technical область перед поиском вложения;
   - сделать screenshot runner не fail-fast: собирать ошибки по всем scenario/viewport и падать только итоговой сводкой;
   - синхронизировать `verify:visual`, `visual:check` и ожидаемые screenshots.

2. Mobile shell/composer:
   - уменьшить источник истины для нижних fixed-слоёв: `--mobile-bottom-nav-height`, `--mobile-bottom-nav-space`, `--mobile-composer-space`;
   - сделать compact composer реально компактным на mobile;
   - держать attachments в маленькой горизонтальной ленте, не расширяя dock до большой панели;
   - скрывать composer в batch mode, где он не является активным рабочим элементом.

3. Overlay contract:
   - у `BottomSheet` сделать content-sized поведение реальным, добавить компактный размер и scroll hint;
   - сделать composer controls sheet компактнее на mobile;
   - сохранить desktop `FloatingPopover`, но ограничить его высотой доступного viewport и внутренним scroll.

4. Gallery:
   - заменить mobile `×` у destructive clear action на корзину/понятный danger action с confirm;
   - заменить кадрирование превью на contain-поведение с нейтральной подложкой;
   - вернуть видимость короткого текста ошибки на mobile через line clamp вместо `display: none`.

## Затрагиваемые файлы

- `docs/UI_VISUAL_REMEDIATION_STAGE_01_PREFLIGHT.md`
- `package.json`
- `scripts/screenshot.config.mjs`
- `scripts/capture-app.mjs`
- `scripts/check-screenshot-artifacts.mjs`
- `src/styles/layers/mobile.css`
- `src/features/workspace/StudioSidebar.module.css`
- `src/features/composer/ImageComposer.tsx`
- `src/features/composer/ComposerLayout.module.css`
- `src/features/composer/ui/ComposerPopover.module.css`
- `src/features/composer/elements/control-menu/ComposerControlMenu.module.css`
- `src/features/composer/elements/control-menu/ComposerControlMenuAction.tsx`
- `src/shared/ui/BottomSheet/BottomSheet.tsx`
- `src/shared/ui/BottomSheet/BottomSheet.module.css`
- `src/shared/ui/AttachmentImageStrip/AttachmentImageStrip.module.css`
- `src/features/gallery/elements/clear-results/ClearResultsAction.tsx`
- `src/features/gallery/sections/header/GalleryHeaderSection.module.css`
- `src/features/gallery/sections/shared/GalleryTileSection.module.css`
- `src/features/gallery/sections/quick-actions/GalleryQuickActionsSection.module.css`

## Симуляция результата

- На `360×800` bottom nav занимает около 60px, compact composer — около 62–74px без вложений и около 110–120px с одним вложением, а не превращается в доминирующую fixed-панель.
- С одним attachment отображается маленькая горизонтальная лента; prompt остаётся основной строкой.
- Composer controls на mobile открывается как компактный sheet с body-scroll и нижним fade, а quick actions sheet заканчивается сразу после списка команд.
- Desktop popover открывается относительно кнопки controls, ограничен `--floating-available-height` и скроллится внутри.
- Галерея показывает всё изображение целиком; не обрезает подпись внутри результата.
- Удаление всех результатов не выглядит как закрытие страницы и требует подтверждения.
- Visual run создаёт все ожидаемые screenshots или в конце честно перечисляет все упавшие сценарии.

## Риск технического долга

- Дублирование компонентов: низкий. Правки остаются внутри существующих owner-компонентов и shared primitives.
- Новые глобальные CSS-правки: средний. Разрешены только переменные shell-слоёв в `mobile.css`; конкретная визуалка остаётся в CSS Modules.
- Рост CSS/TS-файлов сверх debt budgets: средний. Следить за `css:check` и `debt:check`; не создавать новые one-off primitives.
- Обход Definition/Placement: низкий. Слоты и placement не меняются.
- Нестабильные test selectors: средний. Новые visual steps должны использовать `data-testid`/data-атрибуты, не CSS-module classes, кроме старых fallback-ов.
- Производительность/motion: низкий. Добавляются только layout/style правки, без тяжёлых transition-ов.
- Accessibility/touch targets: средний. Clear action и composer controls должны сохранить минимум 44px на mobile.

## Нужен ли предварительный рефакторинг

Да, но маленький и локальный:

1. Visual runner result aggregation в `capture-app.mjs`, чтобы избежать fail-fast.
2. Небольшое расширение `BottomSheet` через `compact`/`scrollHint`, потому что иначе каждый sheet начнёт чиниться собственным CSS-хаком.
3. Добавление `data-testid="composer-dock"` и `data-composer-attachments`, чтобы visual QA не зависел от CSS classes.

## Проверки после этапа

- `npm run build`
- `npm run ui:check`
- `npm run visual:check` после capture
- `npm run verify:visual`, если Chromium policy позволит локальный runner
- ручной просмотр ключевых screenshots: `mobile-gallery`, `mobile-composer-attachments`, `mobile-composer-controls`, `desktop-composer-controls`, `mobile-gallery-quick-actions`, `mobile-detail`, `mobile-attachment-preview-modal`

## Итоговый статус

- Статус: выполнено.
- Debt gate: пройден. Локальный refactor runner + BottomSheet primitive выполнен до визуальных правок.
