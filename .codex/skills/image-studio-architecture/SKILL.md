---
name: image-studio-architecture
description: Use for Image Studio architecture, refactoring, modularization, ownership boundaries, technical debt, roadmap work, and planned structural changes.
---

# Image Studio architecture

Use this skill when work touches architecture, refactoring, modularity, ownership, technical debt, or implementation plans.

## Main architectural direction

Image Studio should move toward a clean modular architecture built around this separation:

```txt
Definition = what an element is and how it works.
Placement = where, when, and with which local settings it is used.
```

A reusable UI element should not be copied into multiple places. Define it once and connect it through placement/config where needed.

## Layer direction

Target orientation:

```txt
src/
  app/          # routing, providers, wiring, top-level commands
  shared/       # reusable UI, helpers, types, tokens
  entities/     # domain entities: generation, provider, model, attachment
  features/     # user-facing reusable capabilities
  processes/    # long workflows: generation runner, batch runner, probing
  pages/        # pages composed from features/widgets/slots
  interface/    # registry, placements, SlotHost, slot contexts
```

Do not force a large refoldering if the task does not need it. Use this as a direction for incremental changes.

## Styling ownership

`global.css` should not become a warehouse for component-specific styles.

Allowed in global CSS:

- reset;
- variables and design tokens;
- base typography;
- truly shared utilities.

Concrete component styles should live near the component, for example:

```txt
GalleryCard.tsx
GalleryCard.module.css
```

## Data-driven project shape

Prefer data/config/strategy descriptions over hardcoded JSX and repeated central edits for:

- themes;
- defaults;
- translations;
- provider and model capabilities;
- parameter schemas;
- presets;
- placements;
- response/request adapters.

Provider-specific and model-specific logic should be extensible without changing every central type and every UI component.

## Refactoring rules

Do not refactor just to make code look nicer.

Refactoring is worthwhile when it:

- reduces coupling;
- removes duplication;
- clarifies ownership;
- extracts process logic out of UI;
- creates stable extension points;
- makes future changes safer;
- supports the current roadmap.

Before a planned stage, consider whether the change would add technical debt, weaken architecture, increase coupling, or make future extension harder. If so, do a small preparatory refactor first.

## Bug work

For bugs:

1. Identify whether the symptom comes from UI, state, adapter, runner, persistence, capabilities, or layout.
2. Find the source of truth in code.
3. Fix the cause, not only the visible symptom.
4. Check adjacent scenarios that may regress.
5. If it looks like a regression, inspect the structural reason.
