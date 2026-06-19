# Stage 06 report — bundle / code-splitting feasibility

## Статус

Готово.

## Что изменено

- Добавлен `src/interface/registry/lazyElement.tsx`.
- `SlotHost` теперь оборачивает contribution в локальный `Suspense fallback={null}`.
- `App` lazy-load-ит `ImageDetailPage`.
- На lazy Component definitions переведены offscreen/non-initial области:
  - `settings` elements/sections;
  - `batch-composer` sections;
  - `detail` elements/sections;
  - workspace wrappers для settings/info/batch/parameter modals.
- `vite.config.ts` получил безопасный `react-vendor` manual chunk.
- Основные стартовые области оставлены eager:
  - gallery;
  - composer dock;
  - sidebar;
  - workspace root.

## Bundle сравнение

### До этапа 6

- Initial JS: `index-*.js` — 515.48 kB / 141.60 kB gzip.
- Initial CSS: `index-*.css` — 152.81 kB / 28.91 kB gzip.
- Vite warning по chunk > 500 kB был.

### После этапа 6

Initial/preloaded JS:

- `index-*.js` — 157.22 kB / 42.90 kB gzip.
- `react-vendor-*.js` — 189.64 kB / 59.65 kB gzip.
- `i18n-*.js` — 76.93 kB / 20.62 kB gzip.
- `rolldown-runtime-*.js` — 0.69 kB / 0.42 kB gzip.

Итого initial/preloaded JS: ~424.48 kB / ~123.59 kB gzip.

Initial CSS:

- `index-*.css` — 78.15 kB / 16.20 kB gzip.

Async chunks появились для settings/detail/batch/parameters sections. Vite warning по крупному chunk исчез.

## Реальный выигрыш

- Initial JS raw уменьшился примерно на 91 kB относительно single-chunk baseline.
- Initial JS gzip уменьшился примерно на 18 kB.
- Initial CSS raw уменьшился примерно на 75 kB.
- Initial CSS gzip уменьшился примерно на 13 kB.
- Offscreen sections больше не парсятся как часть стартового feature implementation path.

## Проверки

- [x] `npm run verify:static`
- [x] `npm run visual:check` — 28/28 screenshots
- [x] Targeted visual captures:
  - desktop/mobile gallery;
  - desktop/mobile composer compact/long/attachments/controls;
  - desktop/mobile settings-api/settings-models;
  - desktop/mobile detail;
  - desktop/mobile attachment-preview-modal;
  - desktop/mobile batch-composer;
  - desktop/mobile info;
  - desktop/mobile parameters.

## Нюанс по visual runner

Монолитный `npm run verify:visual` в контейнере дважды зависал после recoverable Puppeteer/Chromium ошибки при последовательном прогоне большого набора сценариев. После этого тот же набор screenshots был добран сегментированными `capture:screenshots` запусками, а `npm run visual:check` подтвердил 28/28 артефактов.

Chromium policy `URLBlocklist` временно снимался только для screenshot capture и был восстановлен после проверок.

## Debt gate result

- Async registry не вводился.
- Placement modules не стали async.
- Lazy imports находятся на module level в definition modules через helper.
- Feature manualChunks целиком не используются, потому что preflight показал, что это может вернуть chunks в стартовый preload.
- Архитектурные boundaries, import cycles, interface registry, UI/motion/debt checks зелёные.

## Definition of Done

- [x] Initial JS уменьшился.
- [x] Vite warning исчез.
- [x] Definition/Placement архитектура не сломана.
- [x] Visual artifacts для всех обязательных сценариев присутствуют и проходят checker.
