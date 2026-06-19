# Comfy/local stage 09 preflight

## Цель этапа

Сделать страницу деталей adapter-aware: OpenAI-compatible задачи должны отображаться как раньше, а ComfyUI-задачи должны показывать понятный workflow summary, runtime-данные и технические JSON-блоки без ComfyUI-хардкода внутри generic `sentParameters`.

## Планируемые изменения

- Добавить минимальное поле `providerAdapterId` в `GenerationRequestSnapshot`.
- Сохранить backward compatibility: старые задачи без `providerAdapterId` распознавать через `surfaceId` и fallback.
- Ввести `ProviderDetailDescriptor` в feature/model-слое деталей.
- Перевести `sentParameters` и `DetailSnapshotSections` на descriptor API.
- Для ComfyUI добавить rows:
  - checkpoint/model;
  - LoRA stack;
  - size/batch;
  - sampler/scheduler/steps/cfg/denoise/seed;
  - prompt id;
  - output refs;
  - workflow node count.
- Добавить technical blocks:
  - payload JSON;
  - ComfyUI workflow JSON;
  - ComfyUI history JSON;
  - raw response;
  - raw image item.
- Добавить screenshot scenarios для ComfyUI details.

## Затрагиваемые файлы

- `src/domain/generationTask.ts`
- `src/domain/generationSnapshots.ts`
- `src/entities/storage/generationTasks.ts`
- `src/entities/generation-params/comfyui/state.ts`
- `src/features/detail/model/detailDescriptors.ts`
- `src/features/detail/sentParameters.ts`
- `src/features/detail/sections/snapshot/DetailSnapshotSections.tsx`
- `src/shared/i18n/locales/*/detail.json`
- `scripts/screenshot.config.mjs`
- `tests/detail-descriptor.test.ts`

## Симуляция результата

- Новый пользовательский сценарий: пользователь открывает ComfyUI-результат и видит не OpenAI-style payload, а ComfyUI workflow: checkpoint, LoRA, sampler, seed и runtime id.
- Новый data flow: snapshot хранит `providerAdapterId` и `parameterSummary`; detail renderer выбирает descriptor через `providerAdapterId`/`surfaceId`.
- Что останется неизменным: OpenAI-compatible details, copy params, raw payload, storage old tasks.
- Что будет расширено добавлением, а не редактированием старой логики: ComfyUI details добавляются отдельным descriptor, generic `sentParameters` только делегирует.

## Debt/architecture gate

- Provider-specific код не протекает в feature UI: да, `DetailSnapshotSections` вызывает descriptor, но не парсит ComfyUI payload напрямую.
- Новые параметры не раздувают общий ImageParams: да, используется `providerParams`/`parameterSummary`.
- Settings не превращаются в набор if adapterId === ...: не затрагиваются.
- Detail page не хардкодит ComfyUI поля: поля изолированы в descriptor strategy.
- Storage сохраняет старые задачи без миграционных поломок: нужен sanitizer test.
- Batch/single runner не получают provider-specific ветвления: runner не меняется.
- CSS локален, без глобальных заплаток: CSS не меняется.
- Accessibility/keyboard для новых popover/dropdown сохранены: UI-контролы не меняются.

## Нужен ли предварительный рефакторинг

Да, маленький: перед добавлением ComfyUI rows нужен descriptor layer для details, иначе ComfyUI-логика попала бы в `sentParameters.ts` и snapshot JSX.

## Проверки после этапа

- `npm run verify:static`
- `npm run capture:screenshots -- --viewports=desktop,mobile --scenarios=detail,detail-comfy,detail-comfy-technical --out=artifacts/stage09-visual`
- `node scripts/check-screenshot-artifacts.mjs --dir=artifacts/stage09-visual --viewports=desktop,mobile --scenarios=detail,detail-comfy,detail-comfy-technical`

## Итоговый статус

Готово.
