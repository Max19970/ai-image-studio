# ComfyUI local generation — этап 5 preflight

Дата: 2026-06-19

## Цель этапа

Добавить серверный adapter `comfyui`, который может работать с локальным ComfyUI как с самостоятельным provider family, не имитируя OpenAI-compatible endpoint.

## Симуляция изменений перед кодом

Планируемый поток:

1. `POST /api/generate` получает `{ provider: { adapterId: "comfyui", generationEndpoint }, payload }`.
2. Server provider registry выбирает `server/providers/comfyui/adapter.ts`.
3. Adapter строит ComfyUI workflow на сервере, а не в React UI.
4. Adapter вызывает ComfyUI:
   - `POST /prompt`;
   - polling `/history/{prompt_id}`;
   - загрузка результата через `/view`.
5. Adapter возвращает нормализованный JSON, совместимый с текущим response mapper приложения: `data[].b64_json` + `output_format`.
6. Галерея и lifecycle не меняются.

## Проверка на технический долг

### Риски

- Размазать ComfyUI workflow JSON по UI и request builder.
- Добавить прямые `fetch` к ComfyUI из клиента.
- Использовать `/interrupt` без политики владения очередью, случайно отменяя чужие задачи в ComfyUI.
- Сделать `adapter.ts` большим файлом с fetch/workflow/polling логикой.
- Расширить OpenAI-compatible payload mapper ComfyUI-полями.

### Решение

- Workflow template вынесен в `server/providers/comfyui/workflowTemplates.ts`.
- Сетевые вызовы и нормализация ошибок вынесены в `http.ts`/`errorNormalizer.ts`.
- Resources вынесены в `resources.ts`.
- Polling/generation orchestration вынесен в `requestHandlers.ts`.
- `adapter.ts` остаётся composition entry.
- `/interrupt` не используется в MVP; abort browser request только прекращает ожидание Image Studio.

## Границы MVP

Входит:

- text-to-image workflow;
- checkpoint injection;
- LoRA stack injection;
- sampler/scheduler/steps/cfg/seed/size/batch injection;
- live resources: checkpoints, LoRA, samplers, schedulers;
- mock ComfyUI generation flow в тестах.

Не входит:

- image-to-image;
- inpaint/mask;
- ControlNet;
- arbitrary user workflows;
- WebSocket progress stream;
- global `/interrupt` cancellation.
