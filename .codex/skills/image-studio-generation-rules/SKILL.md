---
name: image-studio-generation-rules
description: Use for Image Studio provider/model/generation work, generation runners, batch/multi mode, attachments, LoRA, provider capabilities, and prompt composer behavior.
---

# Image Studio generation rules

Use this skill for generation-related product logic and UI.

## Multi-provider direction

Image Studio is a multi-provider and multi-model tool. Do not hardwire logic to one API, one model, or one response format.

Keep these concerns separate:

```txt
provider config
model config
capability probing
request adapter
response adapter
generation runner
UI
```

## Batch / multi generation

Multi generation is an orchestrator for sending many requests.
Each request in a batch must be independently configurable:

- provider;
- model;
- parameters;
- attachments;
- generation/edit mode;
- status;
- retry/cancel/error state.

Do not design batch as if every request must share one global provider, model, or parameter set.

## Attachments

If a user attaches files and then switches to a provider/model that does not support them, attachments must not merely disappear from the UI while remaining in state.

Valid behavior should be explicit:

- remove them through a shared state transition;
- block the switch;
- or move them into a clearly visible unsupported state.

Hidden preserved attachments are a bug.

## LoRA

LoRA controls should not live in composer quick actions.
With many LoRA entries, toggling them from an action menu becomes unusable.

LoRA should be configured in generation parameters through a compact dedicated interface.

## Prompt textarea

Prompt fields in both normal composer and batch composer should:

- expand on focus;
- collapse to a compact one-line state when not focused;
- scroll vertically, not horizontally;
- avoid hidden sideways overflow;
- behave consistently across mono and multi modes.

## Implementation guidance

Prefer shared transitions and reusable capability checks over duplicated UI-specific conditionals.
When fixing generation behavior, inspect both mono and batch paths.
