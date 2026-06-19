# UI remediation stage 02 preflight

Дата: 2026-06-19

## Цель этапа

Закрыть mobile-composition pass после критичного P1-прохода: упростить мобильные settings, сделать parameters tabs понятными, уплотнить attachments/quick actions, убрать пустоту batch-экрана и перестроить detail topbar/actions.

## Проблемы из аудита

- #7 P2 — mobile settings имеют слишком много уровней навигации.
- #8 P2 — save bar показывается при отсутствии изменений.
- #9 P2 — desktop parameters имеют лишнюю фиксированную высоту.
- #10 P2 — mobile parameters tabs обрезаются без подсказки.
- #12 P2 — один attachment создаёт непропорционально большую область composer.
- #13 P2 — batch mobile title сокращается до «Мульти».
- #14 P2 — batch screen оставляет большую пустую область.
- #17 P2 — mobile detail header перегружен.
- #18 P2 — detail actions имеют слабую иерархию.
- #19 P2 — quick actions sheet слишком велик для коротких команд.

## Планируемые изменения

1. Settings:
   - mobile hero сделать компактнее;
   - save bar скрывать в clean-state, показывать sticky только при dirty/saved feedback;
   - API mobile switch объединить с заголовком текущего списка.
2. Parameters:
   - desktop modal перевести с фиксированной высоты на `max-height` и content-driven layout;
   - mobile tabs уменьшить, добавить edge fade и auto-scroll активной вкладки.
3. Attachments / quick actions:
   - дополнительно уплотнить compact thumbnails;
   - оставить quick actions на shared `BottomSheet` compact/content contract.
4. Batch:
   - заменить mobile title на законченное название;
   - убрать sticky footer, который создавал пустую область между формой и bottom nav;
   - уменьшить bottom padding stage.
5. Detail:
   - перестроить topbar в two-row mobile layout;
   - поменять action hierarchy: restore request primary, download secondary, copy actions в grouped overflow menu.

## Затрагиваемые файлы

- `src/features/settings/SettingsPage.tsx`
- `src/features/settings/SettingsPage.module.css`
- `src/features/settings/sections/save-bar/SettingsSaveBarSection.tsx`
- `src/features/settings/sections/generation-api/GenerationApiSettingsSection.tsx`
- `src/features/settings/sections/generation-api/GenerationApiSettingsSection.module.css`
- `src/features/parameters/ParameterPanel.tsx`
- `src/features/parameters/ParameterPanel.module.css`
- `src/features/parameters/ParametersModal.module.css`
- `src/shared/ui/AttachmentImageStrip/AttachmentImageStrip.module.css`
- `src/features/composer/ComposerLayout.module.css`
- `src/features/batch-composer/MultiImageComposer.module.css`
- `src/features/batch-composer/sections/header/BatchComposerHeaderSection.module.css`
- `src/features/batch-composer/sections/footer/BatchComposerFooterSection.module.css`
- `src/features/detail/sections/topbar/DetailTopbarSection.tsx`
- `src/features/detail/sections/topbar/DetailTopbarSection.module.css`
- `src/features/detail/sections/hero/DetailHeroSection.module.css`
- `src/features/detail/elements/load-composer/LoadComposerAction.tsx`
- `src/features/detail/elements/copy-menu/*`
- `src/interface/placements/detail.actions.placement.ts`
- `src/shared/i18n/locales/{ru,en}/{batch,detail}.json`

## Симуляция результата

- На mobile settings первый полезный блок настроек виден быстрее: clean save strip не занимает отдельный уровень, API focus живёт рядом с заголовком списка.
- Parameters modal на desktop больше не держит короткую вкладку в искусственных `84dvh`; на mobile вкладки явно продолжаются вправо и активная вкладка центрируется.
- Batch на `360px` показывает осмысленный title `Очередь`, а footer логически закрывает форму, не зависая над bottom nav.
- Detail на mobile разделяет back/status и title; action bar держит основные действия отдельно от технических copy-команд.

## Риск технического долга

- Дублирование компонентов: низкий. Новый component добавляется только для grouped `detail.copyMenu`, потому что это новая композиционная единица.
- Новые глобальные CSS-правки: нет. Все изменения остаются в owner CSS modules/shared primitive CSS.
- Рост CSS/TS-файлов сверх debt budgets: низкий; проверяется `debt:check` и `css:check`.
- Обход Definition/Placement: нет; detail action hierarchy меняется через placement и новый definition.
- Нестабильные test selectors: новые visual проверки используют существующие scenarios, новых brittle selectors не добавляется.
- Производительность/motion: layout/motion-heavy transitions не добавляются.
- Accessibility/touch targets: сохраняются `Button`, `BottomSheet`, `FloatingPopover`; grouped copy menu получает menu semantics.

## Нужен ли предварительный рефакторинг

Да, маленький и локальный: добавить `detail.copyMenu` как отдельную definition, чтобы не прятать три copy-кнопки CSS-ом и не дублировать их в mobile layout.

## Проверки после этапа

- `npm run build`
- `npm run ui:check`
- `npm run css:check`
- `npm run debt:check`
- `npm run motion:check`
- `npm run arch:check:strict`
- `npm run imports:check`
- `npm run interface:check`
- `npm test`
- targeted visual capture: `settings-api`, `settings-models`, `parameters`, `batch-composer`, `detail`, `composer-attachments`, `gallery-quick-actions` for desktop/mobile.

## Итоговый статус

Preflight пройден. Крупный рефакторинг не нужен; достаточно локального `detail.copyMenu` и owner-level layout правок.
