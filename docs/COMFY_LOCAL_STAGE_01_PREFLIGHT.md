# Comfy/local stage 01 preflight

## Цель этапа

Расширить provider adapter contract до v2 так, чтобы будущий ComfyUI provider мог объявлять capabilities, live resources, provider-owned generation surface и provider-owned detail descriptor без ветвлений в feature UI.

## Планируемые изменения

- Расширить server adapter definition:
  - `capabilities`;
  - `resources`;
  - optional `fetchResources(provider, kind)`.
- Добавить server route `POST /api/provider/resources`.
- Расширить client adapter definition:
  - `capabilities`;
  - `resources`;
  - `generationSurface`;
  - `detailDescriptor`.
- Зарегистрировать эти поля у OpenAI-compatible adapter как baseline/default implementation.
- Добавить client helper для запроса provider resources.
- Обновить checker и contract tests, чтобы отсутствие новых adapter-owned полей считалось архитектурной ошибкой.

## Затрагиваемые файлы

- `server/providers/types.ts`
- `server/providers/openai-compatible/adapter.ts`
- `server/routes/providerRoutes.ts`
- `src/entities/provider/types.ts`
- `src/providers/openai-compatible/definition.ts`
- `src/infrastructure/api.ts`
- `scripts/check-provider-adapters.mjs`
- `tests/provider-adapter-contract.test.ts`
- `docs/PROVIDER_ADAPTER_CONTRACT.md`

## Симуляция результата

- Новый пользовательский сценарий: пользовательских изменений пока нет, но приложение получает безопасный контракт для provider resources.
- Новый data flow: UI сможет запросить `/api/provider/resources` через `fetchProviderResources`, route выберет adapter через registry, adapter либо вернёт resource list, либо controlled unsupported error.
- Что останется неизменным: OpenAI-compatible generation/edit/probe/request/response.
- Что будет расширено добавлением, а не редактированием старой логики: ComfyUI позже добавится отдельным adapter module и resource fetcher, без правок composer/detail/settings под конкретный adapter id.

## Debt/architecture gate

- Provider-specific код не протекает в feature UI: да, новые поля живут в adapter definitions.
- Новые параметры не раздувают общий ImageParams: да, `generationSurface` добавлен как контракт, без новых параметров.
- Settings не превращаются в набор if adapterId === ...: да, settings по-прежнему берут adapter-owned metadata.
- Detail page не хардкодит ComfyUI поля: да, добавлен `detailDescriptor` contract.
- Storage сохраняет старые задачи без миграционных поломок: да, storage не меняется.
- Batch/single runner не получают provider-specific ветвления: да.
- CSS локален, без глобальных заплаток: CSS не меняется.
- Accessibility/keyboard для новых popover/dropdown сохранены: UI ещё не меняется.

## Нужен ли предварительный рефакторинг

Да, но он входит в сам этап: contract-first расширение adapter definitions и checker/tests до добавления ComfyUI UI.

## Проверки после этапа

- `npm run providers:check`
- `npm test -- tests/provider-adapter-contract.test.ts`
- `npm run build`

## Итоговый статус

В работе.
