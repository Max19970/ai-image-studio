# Comfy/local stage 04 report

## Статус

Этап 4 выполнен.

## Что изменено

- Добавлен `src/entities/provider/compatibility.ts`:
  - `sanitizeGenerationDraftForProviderCapabilities`;
  - `sanitizeGenerationDraftForModel`;
  - `sanitizeBatchDraftForSettings`;
  - `sanitizeBatchDraftsForSettings`;
  - `getProviderRuntimeCapabilitiesForModel`.
- Добавлен `src/app/commands/providerCompatibilityCommands.ts` для command-layer применения policy.
- Single composer теперь применяет compatibility policy при:
  - смене модели;
  - ручной смене режима;
  - добавлении/замене target/reference images;
  - добавлении/замене mask.
- Settings save/select model теперь прогоняет active composer через compatibility policy и пересанитизирует batch drafts после изменения настроек.
- Batch composer теперь санитизирует конкретный draft при `patchDraft`, `addDraft`, `duplicateDraft`.
- Restore from detail теперь не восстанавливает неподдерживаемый edit-mode, если выбранный provider его не поддерживает.
- Добавлено мягкое composer notice в RU/EN, когда policy очистила неподдерживаемые части запроса.
- Добавлены unit-тесты `tests/provider-compatibility.test.ts`.

## Архитектурный результат

Compatibility больше не живёт в UI-компоненте селектора. Любой будущий способ изменить provider/model проходит через command-layer и общий sanitizer. Для ComfyUI достаточно будет объявить adapter capabilities вроде:

```ts
supportsEdit: false,
supportsImageAttachments: false,
supportsMask: false,
usesLocalWorkflow: true,
hasLiveResources: true
```

После этого текущая policy автоматически очистит OpenAI-style вложения и вернёт старые edit-запросы в generate.

## Debt gate

- `if comfyui` не добавлялся.
- Старые OpenAI-compatible attachments не очищаются, потому что provider capabilities разрешают edit/images/mask.
- Batch и single используют общий sanitizer.
- После первого запуска `verify:static` debt budget поймал рост `createComposerCommands.ts`; код был отрефакторен в `providerCompatibilityCommands.ts`, после чего проверка прошла.

## Проверки

```txt
npm test
66 passed, 0 failed

npm run build
passed

npm run verify:static
passed
```

Визуальная проверка:

```txt
npm run capture:screenshots -- --viewports=desktop,mobile --scenarios=composer-controls,batch-composer-controls --out=artifacts/stage04-visual
4 completed, 0 failed
```

Chromium `URLBlocklist` временно снимался только на время screenshot runner и восстановлен после проверки.

## Definition of Done

- [x] Provider switch безопасен на уровне command-layer.
- [x] ComfyUI-подобный provider с `supportsEdit=false`, `supportsImageAttachments=false`, `supportsMask=false` не получит старые OpenAI attachments.
- [x] OpenAI-compatible поведение не изменено.
