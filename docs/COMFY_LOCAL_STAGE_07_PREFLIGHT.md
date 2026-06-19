# ComfyUI local generation — этап 7 preflight

Дата: 2026-06-19

## Цель этапа

Добавить настройки ComfyUI без раздувания общей модели API-настроек:

- ComfyUI provider как локальный adapter с base URL.
- Checkpoint model через live resources dropdown.
- Registry LoRA в настройках приложения.
- Resource cache для checkpoints/LoRA.

## Симуляция изменений до внедрения

### 1. Где хранить LoRA registry

Вариант "добавить поля в `GenerationModel`" отклонён: LoRA — не свойство OpenAI-compatible model и не должна появляться у всех моделей.

Выбран extension bucket:

```ts
StudioSettings.adapterData?: Record<string, unknown>
```

ComfyUI хранит данные под ключом adapter-а:

```ts
adapterData.comfyui = {
  loras,
  resourceCache
}
```

### 2. Как показывать ComfyUI-specific fields

Вариант "if provider.adapterId === 'comfyui'" внутри всех editor-компонентов отклонён.

Введён adapter-driven список settings fields. Общие provider editor-компоненты спрашивают adapter, какие поля показывать.

### 3. Как выбрать checkpoint

Для OpenAI-compatible остаётся ручное `modelId`.

Для provider-а с `modelResourceKind: 'checkpoints'` model editor показывает styled `PopoverSelect` по live resource cache. Если cache пустой, остаётся ручной input с явной подсказкой и кнопкой refresh.

### 4. Где обновлять live resources

В отдельной вкладке ComfyUI, через существующий provider resources API:

- `checkpoints`
- `loras`

Результаты кладутся в resource cache settings, чтобы settings UI мог работать без прямых запросов из каждого поля.

## Debt-risk scan

| Риск | Решение |
|---|---|
| ComfyUI-ветвления расползутся по settings UI | `adapterSettingsFieldsForProvider` + `modelResourceKind` |
| LoRA registry станет частью OpenAI model | `StudioSettings.adapterData.comfyui` |
| Checkpoint dropdown станет native `<select>` | используется существующий `PopoverSelect` |
| Новый settings hook превысит debt budget | ComfyUI logic вынесена в `useComfyUiSettingsDraft` |
| Empty ComfyUI checkpoint случайно заменится OpenAI default model id | `normalizeModel` сохраняет пустой `modelId` через nullish fallback |

## План проверок

- `npm test`
- `npm run debt:check`
- `npm run verify:static`
- Screenshot scenarios:
  - `settings-api`
  - `settings-models`
  - `settings-comfyui`
  - `settings-comfyui-provider`
