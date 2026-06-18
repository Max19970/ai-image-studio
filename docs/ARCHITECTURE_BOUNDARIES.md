# Architecture boundaries

This document is the migration guardrail for Image Studio's transition from the legacy `src/components` architecture to the definition/placement architecture.

The goal is not to pretend the current tree is already clean. The goal is to stop new debt from being added while the existing debt is migrated in controlled stages.

## Layer intent

```text
src/app            application composition root, top-level state wiring, command binding
src/interface      slots, placements, definitions registry, context adapters, UI composition contracts
src/features       feature UI and feature-owned behavior
src/entities       app concepts, parameter/provider/settings models, capability helpers
src/processes      long-running workflows: generation, batch runner, storage sync
src/providers      provider-specific client adapters
src/infrastructure external IO: API, storage, optimization boundaries
src/shared         reusable primitives, tiny helpers, i18n runtime, UI kit
src/domain         transitional domain helpers used by older and newer layers
src/components     removed legacy layer; do not recreate
```

## Allowed dependency direction

These are the target rules for new code.

```text
app            -> interface, features, entities, processes, infrastructure, shared, domain
interface      -> shared, entities/types, domain/types, feature definitions/contexts only when needed for composition
features       -> shared, entities, processes contracts, interface registry/types, domain helpers
entities       -> shared, domain-free model helpers, provider contracts where explicitly part of provider registration
processes      -> entities, infrastructure boundaries, domain helpers, shared
providers      -> entities/provider contracts, domain types, shared
infrastructure -> entities/processes contracts, domain types, shared
shared         -> external packages and local shared modules only
components     -> removed; any recreation requires architecture review
```

## Legacy quarantine rule

`src/components` was removed during Stage 2 and must not be recreated as a general component bucket.

New code must not import from or reintroduce `src/components`. If a reusable piece is needed:

1. move a general primitive to `src/shared/ui`, or
2. move feature-specific UI into the owning `src/features/**` module, or
3. create a reusable feature element under `src/features/**/elements/**/definition.ts` and place it through `src/interface/placements`.

The Stage 2 baseline contains zero active `src/components` violations. Any new import or recreated legacy bucket should fail review.

## Checked rules

`npm run arch:check` enforces these rules against the current baseline:

- `no-import-from-legacy-components` — no new imports from `src/components` outside the legacy folder.
- `no-legacy-components-to-features` — legacy components must not grow new dependencies on `src/features`.
- `no-shared-upward-imports` — `src/shared` must stay independent from higher project layers.
- `no-entities-to-features-or-app` — entities must not depend on app/features/interface/components.
- `no-processes-to-app-or-features` — processes must not depend on app/features/components/interface UI.

The baseline is currently clean. The checker should fail when any new violation appears.

## Working with the baseline

Normal check:

```bash
npm run arch:check
```

Strict check, useful near the end of the migration:

```bash
npm run arch:check:strict
```


Interface registry check:

```bash
npm run interface:check
```

`interface:check` validates the Stage 4 definition/placement registry: stable definition ids, stable placement ids, placement `use` targets, duplicate ids, and absence of active legacy slot runtime files.

Regenerate the baseline only after an intentional architecture review:

```bash
node scripts/check-architecture.mjs --write-baseline
```

Do not refresh the baseline just to hide a new violation. If the checker fails, either move the dependency to the correct layer or explicitly decide that the rule needs to change.

## Migration workflow

When moving a legacy component:

1. move the file to the target layer;
2. update imports;
3. run `npm run arch:check`;
4. verify that the moved records show up as resolved baseline violations;
5. regenerate the baseline only after the stage is complete and reviewed;
6. run `npm run build`.

This gives us a visible shrinking debt counter while keeping the app usable throughout the migration.
