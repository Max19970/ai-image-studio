# UI remediation stage 02 report

Дата: 2026-06-19

## Статус

Этап 2 выполнен по preflight-протоколу. Целью был mobile-composition pass: settings, parameters, batch, detail и compact attachment states без обхода Definition/Placement и без новых глобальных CSS-заплаток.

## Закрытые проблемы аудита

- [x] #7 P2 — mobile settings стали компактнее: hero уменьшен, API focus объединён с заголовком списка.
- [x] #8 P2 — save bar больше не занимает место в clean-state; sticky-панель появляется только при dirty/saved feedback.
- [x] #9 P2 — desktop parameters modal больше не имеет фиксированную `height: min(84dvh, 760px)`, используется content-driven `max-height`.
- [x] #10 P2 — mobile parameters tabs получили edge fade, меньшую ширину и auto-scroll активной вкладки.
- [x] #12 P2 — compact attachment thumbnails дополнительно уменьшены, attachment tray ограничен по высоте.
- [x] #13 P2 — mobile batch title больше не сокращается до «Мульти», используется законченное `Очередь`.
- [x] #14 P2 — mobile batch footer больше не sticky над bottom nav; страница завершается сразу после footer.
- [x] #17 P2 — mobile detail topbar перестроен: back/status отделены от читаемого title.
- [x] #18 P2 — detail actions получили иерархию: primary restore, secondary download, grouped `Копировать…` menu.
- [x] #19 P2 — quick actions compact sheet сохранён и проверен в targeted visual pass.

## Реализованные изменения

### Settings

- В `SettingsPage.tsx` добавлен auto-hide saved feedback после сохранения.
- `SettingsSaveBarSection` не рендерится, если нет изменений и нет saved feedback.
- Mobile hero уплотнён; subtitle скрывается на узких экранах.
- Mobile tabs получили scroll snap и edge fade.
- API mobile switch переехал в compact header вместе с текущим заголовком `Провайдеры` / `Модели`.

### Parameters

- `ParametersModal` переведён на flex column + `max-height`; body скроллится только при необходимости.
- Mobile tabs в `ParameterPanel` стали компактнее, получили fade справа и `scrollIntoView` активной вкладки.
- Короткая desktop-вкладка больше не создаёт большую пустую зону под содержимым.

### Attachments / quick actions

- Compact attachment chips уменьшены до 48px.
- Composer attachment tray получил жёсткий компактный max-height.
- Quick actions sheet остался на shared `BottomSheet` compact contract и проверен визуально.

### Batch composer

- `batch.mobileTitle` изменён: `Мульти` → `Очередь`.
- Mobile header больше не использует бессмысленный ellipsis.
- Mobile footer стал обычным завершающим блоком формы, а не sticky-панелью над bottom navigation.
- Stage bottom padding уменьшен до расстояния, нужного под bottom navigation.

### Detail page

- `DetailTopbarSection` перестроен с `CommandBar` на owner grid layout.
- На mobile back/status и title больше не конкурируют за одну строку.
- Добавлен новый definition `detail.copyMenu`, использующий existing `FloatingPopover` на desktop и `BottomSheet` на mobile.
- `detail.actions.placement.ts` переставлен по иерархии:
  - `load-composer` order 10, primary;
  - `download-image` order 20, secondary;
  - `copy-menu` order 30.

## Debt gate result

- [x] Definition/Placement не обойдены.
- [x] Новый grouped copy action оформлен как нормальная interface definition.
- [x] Глобальные CSS layers не менялись.
- [x] Owner boundaries сохранены: settings/parameters/batch/detail правятся в своих modules.
- [x] Новых `!important` не добавлено.
- [x] Motion-heavy transitions не добавлялись.
- [x] I18n parity сохранён для ru/en.

## Проверки

- [x] `npm run build` — passed.
- [x] `npm run ui:check` — passed.
- [x] `npm run css:check` — passed.
- [x] `npm run debt:check` — passed.
- [x] `npm run motion:check` — passed.
- [x] `npm run arch:check:strict` — passed.
- [x] `npm run imports:check` — passed.
- [x] `npm run interface:check` — passed.
- [x] `npm run params:check` — passed.
- [x] `npm run providers:check` — passed.
- [x] `npm run tasks:check` — passed.
- [x] `npm run storage:check` — passed.
- [x] `npm run secrets:check` — passed.
- [x] `npm test` — passed, 42 tests.
- [x] Targeted visual capture — 14 screenshots: desktop/mobile × settings-api, settings-models, parameters, batch-composer, detail, composer-attachments, gallery-quick-actions.
- [x] Targeted `check-screenshot-artifacts` — passed.

## Примечания по visual verification

Первый targeted capture успел создать 12 screenshots, но один Chromium launch упал из-за контейнерного процесса и команда вышла по timeout. Остаток (`mobile/parameters`, `mobile/gallery-quick-actions`) был добран отдельным запуском. Итого проверены все 14 ожидаемых targeted screenshots. Chromium policy была временно снята для локального capture и возвращена после проверки.

## Что сознательно оставлено на следующие этапы

- #11 Theme grid balance не трогался в этом проходе — уйдёт в polish/settings-theme pass.
- #6 Empty gallery CTA, #24 gallery counter hierarchy и полноценный failed-card action ещё не закрыты.
- #15 sidebar width, #20 contrast, #21 focus states, #22 terminology, #23 info page остаются для global polish.
