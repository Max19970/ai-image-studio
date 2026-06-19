# ComfyUI local generation — этап 5 report

Дата: 2026-06-19

## Что сделано

Добавлен серверный provider adapter `comfyui`:

```txt
server/providers/comfyui/
  adapter.ts
  endpoints.ts
  errorNormalizer.ts
  http.ts
  probeSuite.ts
  requestHandlers.ts
  resources.ts
  responseMapper.ts
  settingsSchema.ts
  workflowTemplates.ts
```

## Архитектура

- `adapter.ts` — только composition entry: capabilities/resources/settings/probe/request handlers.
- `workflowTemplates.ts` — построение text-to-image workflow:
  - `CheckpointLoaderSimple`;
  - `LoraLoader` chain;
  - `CLIPTextEncode` positive/negative;
  - `EmptyLatentImage`;
  - `KSampler`;
  - `VAEDecode`;
  - `SaveImage`.
- `resources.ts` — live resources:
  - checkpoints/models;
  - LoRA;
  - samplers;
  - schedulers.
- `requestHandlers.ts` — generate flow:
  1. normalize payload;
  2. build workflow;
  3. `POST /prompt`;
  4. poll `/history/{prompt_id}`;
  5. load output images through `/view`;
  6. return normalized JSON.
- `responseMapper.ts` — извлечение output image refs из history и упаковка в `data[].b64_json`.
- `probeSuite.ts` — non-destructive quick check/probe без запуска генерации.

## Важные решения

- ComfyUI adapter объявлен как local workflow provider:
  - `supportsGenerate: true`;
  - `supportsEdit: false`;
  - `supportsImageAttachments: false`;
  - `supportsMask: false`;
  - `usesLocalWorkflow: true`;
  - `hasLiveResources: true`.
- Browser abort теперь передаётся server adapters через optional `ProviderFetchContext.signal`.
- `/interrupt` не используется, потому что это глобальное действие ComfyUI и может задеть чужие запущенные workflow.
- Для MVP используется polling `/history/{prompt_id}`. WebSocket progress оставлен на будущий этап, чтобы не усложнять server foundation до появления UI progress semantics.

## Проверки

```txt
npm run providers:check
passed

npm test
70 passed, 0 failed

npm run build
passed

npm run verify:static
passed
```

## Добавленные тесты

`tests/comfyui-server-adapter.test.ts`:

- workflow injection: checkpoint/sampler/scheduler/LoRA chain;
- live resources через fake ComfyUI HTTP server;
- mock generation flow: `/prompt` → `/history` → `/view`;
- response mapper для direct/wrapped history shapes.

## Definition of Done

- [x] Server умеет получить checkpoints/loras/sampler/scheduler data.
- [x] Server умеет выполнить mock ComfyUI generation flow.
- [x] OpenAI-compatible routes не сломаны.
- [x] ComfyUI workflow template не лежит внутри React UI.
- [x] No direct ComfyUI fetch from client.
- [x] `/interrupt` не используется без политики владения очередью.
- [x] `adapter.ts` остаётся маленьким composition entry.
