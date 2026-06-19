# Comfy/local stage 00 preflight

## Цель этапа

Зафиксировать исходную точку перед кодовыми изменениями и явно ограничить MVP локальной генерации: ComfyUI text-to-image, выбор checkpoint, подключение зарегистрированных LoRA и provider-specific детали запроса.

## Планируемые изменения

- Добавить основной план в `docs/COMFY_LOCAL_GENERATION_PLAN_2026-06-19.md`.
- Зафиксировать текущие provider/params/settings/detail точки.
- Не менять runtime-поведение приложения на этом этапе.
- Отложить image-to-image, inpaint, ControlNet и произвольные пользовательские workflow templates до отдельных будущих этапов.

## Затрагиваемые файлы

- `docs/COMFY_LOCAL_GENERATION_PLAN_2026-06-19.md`
- `docs/COMFY_LOCAL_STAGE_00_PREFLIGHT.md`

## Симуляция результата

- Новый пользовательский сценарий: отсутствует, этап только документирует границы.
- Новый data flow: отсутствует.
- Что останется неизменным: текущая OpenAI-compatible генерация, редактирование, batch scheduler, галерея, детали и настройки.
- Что будет расширено добавлением, а не редактированием старой логики: будущий ComfyUI слой начнётся с adapter contract, а не с правок composer UI.

## Debt/architecture gate

- Provider-specific код не протекает в feature UI: да, код не меняется.
- Новые параметры не раздувают общий ImageParams: да, параметры не добавляются.
- Settings не превращаются в набор if adapterId === ...: да.
- Detail page не хардкодит ComfyUI поля: да.
- Storage сохраняет старые задачи без миграционных поломок: да.
- Batch/single runner не получают provider-specific ветвления: да.
- CSS локален, без глобальных заплаток: да.
- Accessibility/keyboard для новых popover/dropdown сохранены: новых элементов нет.

## Нужен ли предварительный рефакторинг

Нет. Этап 0 только фиксирует план и границы MVP.

## Проверки после этапа

- `npm run providers:check`
- `npm run build`

## Итоговый статус

Готово. План помещён в `docs/`, границы MVP зафиксированы, runtime-поведение не изменялось.
