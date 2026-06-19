# Stage 06 preflight — bundle / code-splitting feasibility

## Цель

Проверить, можно ли уменьшить initial JS/CSS без перестройки Definition/Placement registry в async-runtime и без пользовательских регрессий.

## Baseline до этапа

`npm run build` на stage 05 давал один крупный client JS chunk:

- `index-*.js`: 515.48 kB / 141.60 kB gzip.
- `index-*.css`: 152.81 kB / 28.91 kB gzip.
- Vite warning: chunk larger than 500 kB.

## Наблюдение по причине

Основная причина не только React/vendor-код. Registry грузит definitions eager:

- `src/interface/registry/definitions.ts` использует `import.meta.glob(..., { eager: true })`.
- Definition modules для `settings`, `detail`, `batch-composer` импортируют реальные Component implementations.
- Из-за этого offscreen pages/sections попадают в initial bundle даже до открытия соответствующей вкладки.

## Смоделированные варианты

### Вариант A — только Vite manual chunks

Проверено как low-risk build-level split. Он убирает warning, но не даёт полноценного runtime выигрыша: статические зависимости всё равно modulepreload-ятся при старте. Это скорее косметика для build output, чем настоящая разгрузка initial app.

Решение: использовать только безопасный `react-vendor` split, но не группировать feature folders целиком, чтобы не вернуть lazy chunks в HTML preload.

### Вариант B — async registry

Полная переделка registry на async discovery могла бы дать максимальный контроль, но это уже архитектурное изменение: меняется контракт `SlotHost`, порядок resolution, capability filters и enabled checks.

Решение: не делать в этом этапе.

### Вариант C — lazy Component внутри синхронного definition

Сохраняет текущий synchronous Definition/Placement registry:

- definition остаётся доступным сразу;
- placement resolution остаётся синхронным;
- lazy становится только `Component` implementation;
- `SlotHost` получает локальный `Suspense` boundary.

Риск ниже, чем у async registry, а выигрыш реальный: offscreen implementation code уходит из initial chunk.

## Debt gate

- [x] Синхронный registry не ломается.
- [x] Placement configs остаются обычными sync modules.
- [x] Lazy imports не создаются внутри render.
- [x] Feature folders не группируются manualChunks целиком, чтобы не превратить dynamic chunks обратно в eager preload.
- [x] Основные стартовые области `gallery`, `composer`, `sidebar` оставлены eager.
- [x] `Suspense` fallback локальный и `null`, без новых визуальных loading-блоков.

## Выбранный путь

1. Добавить typed helper `lazyElementComponent(...)` в `interface/registry`.
2. Обернуть slot contributions в локальный `Suspense` внутри `SlotHost`.
3. Перевести на lazy только offscreen / non-initial implementations:
   - `settings` definitions;
   - `batch-composer` definitions;
   - `detail` definitions;
   - workspace wrappers для `settings`, `info`, `batch-composer`, parameters modals;
   - detail page в `App`.
4. В Vite оставить только `react-vendor` manual chunk.

## Ожидаемый результат

- Initial JS должен стать меньше 500 kB.
- Vite warning должен исчезнуть.
- CSS для settings/detail/batch/parameters должен уйти в async chunks и не грузиться стартовым CSS.
- Visual сценарии должны остаться стабильными после lazy chunk load.
