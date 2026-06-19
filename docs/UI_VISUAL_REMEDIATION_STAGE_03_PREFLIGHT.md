# UI remediation stage 03 preflight

Дата: 2026-06-19

## Цель этапа

Закрыть global visual polish pass после P1 и mobile-composition этапов: empty gallery, sidebar width, theme grid, contrast/disabled states, focus states, RU terminology, info page и hierarchy счётчика галереи.

## Проблемы из аудита

- #6 P2 — пустая desktop-галерея плохо использует пространство и не даёт явного первого действия.
- #11 P2 — сетка тем несбалансирована на desktop и неочевидна на mobile.
- #15 P2 — desktop sidebar слишком широк для своего содержимого.
- #20 P3 — вторичный текст и disabled-состояния местами слишком тусклые.
- #21 P3 — selected и focus states навигации наслаиваются.
- #22 P3 — русский интерфейс смешивает пользовательские и английские продуктовые термины.
- #23 P3 — info page перегружена вложенными рамками и мелким текстом.
- #24 P3 — счётчик галереи оторван от заголовка и визуально соседствует с destructive action.

## Планируемые изменения

1. Gallery:
   - расширить empty state, добавить CTA `Создать изображение`, фокусирующий prompt;
   - перенести счётчик из `gallery/header-actions` в строку title;
   - добавить `gallery-empty` visual scenario с пустыми seeded tasks.
2. Sidebar:
   - уменьшить `--sidebar-width-expanded` через shell variable;
   - добавить narrower desktop breakpoint ниже 1180px.
3. Theme grid:
   - сделать desktop раскладку 3 колонки на обычной ширине, 5 только на действительно широких экранах;
   - на mobile усилить горизонтальную механику через snap/edge fade/arrow hint.
4. Contrast/focus:
   - поднять читаемость `--muted` и `--faint` в theme tokens;
   - убрать глобальное opacity-disabled как единственный способ показать disabled;
   - задать focus ring в `NavigationButton`, отделённый от selected-state.
5. Terminology/info:
   - локализовать пользовательские термины в ru JSON;
   - оставить `payload/endpoint` только там, где это API/technical context;
   - упростить info CSS: меньше вложенных карточек, больше типографики.

## Затрагиваемые файлы

- `src/styles/layers/app-shell.css`
- `src/styles/layers/base.css`
- `src/shared/ui/Button/Button.module.css`
- `src/shared/ui/NavigationButton/NavigationButton.module.css`
- `src/features/gallery/sections/empty/GalleryEmptySection.tsx`
- `src/features/gallery/ResultsGallery.module.css`
- `src/features/gallery/sections/header/GalleryHeaderSection.tsx`
- `src/features/gallery/sections/header/GalleryHeaderSection.module.css`
- `src/interface/placements/gallery.header-actions.placement.ts`
- `src/features/settings/sections/interface/InterfaceSettingsSection.module.css`
- `src/features/settings/mobileSettingsPrimitives.css`
- `src/features/workspace/StudioInfoPage.module.css`
- `src/shared/i18n/locales/ru/*.json`
- `src/shared/i18n/locales/en/gallery.json`
- `scripts/screenshot.config.mjs`
- `scripts/capture-app.mjs`
- `docs/UI_RU_TERMINOLOGY.md`

## Симуляция результата

- Empty gallery на desktop выглядит как заметный onboarding block, а не маленькая пассивная карточка; CTA ведёт к prompt без нового routing/API.
- Header gallery показывает `Изображения · N`; справа остаются только реальные действия, в том числе очистка.
- Sidebar освобождает рабочую область без обрезания labels.
- Theme grid не складывается в `4 + 1`; mobile strip явно сообщает, что карточки можно прокручивать.
- Disabled controls остаются читаемыми, но больше не выглядят активными primary buttons.
- Keyboard focus виден как внешний ring, а selected остаётся фоном/внутренней рамкой.
- Info page читается ближе к guide, а не к dashboard из вложенных карточек.

## Риск технического долга

- Дублирование компонентов: низкий. Empty CTA использует shared `Button`; новый component не нужен.
- Глобальный CSS: контролируемый. Изменяются только shell/theme tokens и shared primitive focus/disabled states.
- Definition/Placement: один placement упрощён — `gallery.resultCount` больше не используется в header actions, потому что счётчик стал частью header copy.
- Screenshot runner: небольшой контрактный рефакторинг — scenario-level `seedTasks` для empty-state проверок, без brittle DOM mutation после загрузки приложения.
- I18n parity: новые ключи добавляются в ru/en; проверяется тестами.

## Нужен ли предварительный рефакторинг

Да, маленький и локальный: добавить поддержку `scenario.seedTasks` в visual runner, чтобы empty-state сценарии задавались начальным состоянием до загрузки приложения. Это лучше, чем очищать localStorage после старта и перезагружать страницу поверх `evaluateOnNewDocument` seed.

## Проверки после этапа

- `npm run verify:static`
- targeted visual capture: `gallery`, `gallery-empty`, `settings-interface`, `info`, `sidebar-collapsed`, `settings-api` for desktop/mobile.
- targeted `check-screenshot-artifacts` на 12 screenshots.
- Ручной просмотр contact sheet.

## Итоговый статус

Preflight пройден. Крупный рефакторинг не нужен; выполняются owner-level визуальные правки и один маленький runner-contract рефакторинг для empty gallery.
