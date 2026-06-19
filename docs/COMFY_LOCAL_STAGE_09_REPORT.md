# Comfy/local stage 09 report

## Статус

Этап 9 выполнен.

## Что изменено

- `GenerationRequestSnapshot` получил `providerAdapterId?: string`.
- `captureRequestSnapshot` теперь сохраняет adapter id текущего provider-а.
- Storage sanitizer сохраняет `providerAdapterId`, но старые задачи без него остаются валидными.
- Добавлен `src/features/detail/model/detailDescriptors.ts`:
  - `request-snapshot` descriptor для OpenAI-compatible/fallback задач;
  - `comfyui.workflow-summary` descriptor для ComfyUI-задач;
  - fallback detection по `surfaceId`, чтобы старые ComfyUI snapshots без `providerAdapterId` тоже отображались правильно.
- `sentParameters` теперь делегирует построение rows descriptor-у.
- `DetailSnapshotSections` теперь использует descriptor для:
  - sent parameters;
  - metadata rows;
  - runtime rows;
  - technical blocks.
- ComfyUI details показывают:
  - workflow params;
  - checkpoint;
  - LoRA stack;
  - sampler/scheduler/steps/cfg/denoise/seed;
  - prompt id;
  - output refs;
  - workflow node count;
  - workflow/history JSON в технической вкладке.
- `createComfyUiParameterSummary` теперь также сохраняет filename prefix.
- Добавлены i18n-ключи для ComfyUI detail rows.
- Добавлены screenshot scenarios:
  - `detail-comfy`;
  - `detail-comfy-technical`.
- Добавлены тесты detail descriptor и storage sanitizer compatibility.

## Архитектурный результат

ComfyUI-specific отображение находится в detail descriptor, а не в generic UI. `DetailSnapshotSections` больше не знает, какие именно provider-specific поля нужно показывать; он только рендерит rows/technical blocks, которые отдаёт descriptor.

## Проверки

```txt
npm run verify:static
```

Результат: passed.

```txt
npm test
```

Результат внутри verify: `83 passed, 0 failed`.

```txt
npm run build
```

Результат внутри verify: passed.

```txt
npm run capture:screenshots -- --viewports=desktop,mobile --scenarios=detail,detail-comfy,detail-comfy-technical --out=artifacts/stage09-visual
```

Результат: `6 completed, 0 failed`.

```txt
node scripts/check-screenshot-artifacts.mjs --dir=artifacts/stage09-visual --viewports=desktop,mobile --scenarios=detail,detail-comfy,detail-comfy-technical
```

Результат: passed, 6 screenshots checked.

Chromium policy была временно изменена только для скриншотов и восстановлена после проверки.

## Замечания

- Desktop technical screenshot открывает detail page в общем desktop layout, где все группы находятся в правом inspector-scroll; screenshot runner не прокручивает inspector к нижним technical blocks. Unit tests покрывают сами technical blocks, а visual проверяет отсутствие регрессий layout.
- Полный live ComfyUI E2E остаётся на этапе 10.
