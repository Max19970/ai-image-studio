# Generation parameter plugin contract

Image Studio generation parameters are intentionally small, explicit modules. A parameter is not a free-floating UI control: it owns its state keys, copy/i18n, UI link, placement ownership, payload serializer, snapshot behavior, and normalization/restore logic when needed.

## Why this exists

Before this contract, adding a parameter required touching several places and relying on convention:

- logical parameter definition;
- UI field definition;
- composer placement;
- payload serializer;
- snapshot/restore participation;
- labels and descriptions;
- capability gating.

Those pieces still exist, but the logical module now declares the ownership links explicitly, so `npm run params:check` can catch missing or mismatched wiring.

## Module shape

Each parameter lives under:

```txt
src/entities/generation-params/fields/<param>/
  param.ts
  definition.ts
  OptionalCustomField.tsx
```

`param.ts` must use `defineGenerationParam`:

```ts
import { defineGenerationParam } from '../../defineParam';

export const exampleParam = defineGenerationParam({
  id: 'generationParam.example',
  fieldDefinitionId: 'generationParams.example',
  placementIds: ['composer.params.service.example'],
  i18nNamespace: 'params.example',
  stateKeys: ['example', 'includeExample'],
  copy: {
    example: {
      labelKey: 'params.example',
      descriptionKey: 'params.example.description'
    }
  },
  capability: 'example_capability',
  includeKey: 'includeExample',
  payloadKeys: ['example'],
  snapshotKeys: ['example'],
  normalize: ({ current, defaults }) => ({
    example: typeof current.example === 'string' ? current.example : defaults.example
  }),
  openAiCompatiblePayload: ({ params }) => params.includeExample ? { example: params.example } : {}
});
```

## Required ownership fields

| Field | Purpose |
| --- | --- |
| `id` | Stable logical parameter id. Uses `generationParam.*`. |
| `fieldDefinitionId` | The UI field definition id from `definition.ts`. Uses `generationParams.*`. |
| `placementIds` | Composer placement ids owned by this logical parameter. |
| `i18nNamespace` | Human-readable namespace for the parameter's labels/descriptions. |
| `stateKeys` | `ImageParams` keys owned by this parameter. |
| `copy` | Labels/descriptions used by fields and request previews. |

## Optional behavior fields

| Field | Use when |
| --- | --- |
| `options` | The field is a select-like control with known options. |
| `capability` | The provider probe can hide or reveal this parameter. |
| `includeKey` | The user can choose whether this parameter is sent. |
| `payloadKeys` | The parameter writes OpenAI-compatible payload keys. |
| `snapshotKeys` | The parameter should be captured in request snapshots. |
| `normalize` | Persisted/manual values need clamping or migration. |
| `restore` | Restoring from a request snapshot needs custom logic. |
| `openAiCompatiblePayload` | The parameter contributes to provider payloads. |

## Invariants enforced by `npm run params:check`

The checker verifies:

- every non-shared field folder has `param.ts` and `definition.ts`;
- every param module uses `defineGenerationParam`;
- `stateKeys` exist in `ImageParams` defaults;
- `fieldDefinitionId` matches the exported UI definition id;
- every declared `placementId` exists;
- every declared placement uses the declared `fieldDefinitionId`;
- every UI field and placement is owned by a logical param;
- `snapshotKeys` are a subset of `stateKeys`;
- `includeKey` is a subset of `stateKeys` and maps to `payloadKeys`;
- `payloadKeys` imply an OpenAI-compatible serializer;
- copy/option i18n keys exist in both `en` and `ru` dictionaries.

## Adding a new parameter checklist

1. Add the new `ImageParams` keys to `src/domain/types.ts`.
2. Add defaults to `src/data/studio.defaults.json`.
3. Add copy/i18n keys to both locale dictionaries.
4. Create `fields/<param>/param.ts` with `defineGenerationParam`.
5. Create `fields/<param>/definition.ts` or a custom field component.
6. Add composer placement in `placements/composer.parameters.placement.ts`.
7. Add the logical param to `logicalGenerationParamDefinitions` in the intended order.
8. Add provider capability metadata if the parameter is provider-dependent.
9. Add/extend payload tests if it affects the OpenAI-compatible request shape.
10. Run `npm run params:check` and `npm run verify:static`.

## Raw JSON ordering

`rawJsonParam` intentionally stays last in `logicalGenerationParamDefinitions`. This preserves last-write-wins behavior: user-provided raw JSON can override generated OpenAI-compatible payload fields. The behavior is covered by tests.

## What is intentionally not automated yet

The UI is not generated dynamically from `param.ts`. That would hide too much design logic and make custom fields harder to reason about. The contract only makes ownership explicit and regression-checked; it does not turn the settings panel into a generic form renderer.

## Provider-specific parameter availability

Stage 11.1 adds an explicit provider parameter profile. The goal is to let a provider adapter decide which logical generation params are visible and serialized without turning the UI into a generic schema renderer.

Each client provider adapter must expose `generationParams: ProviderGenerationParamProfile`.

```ts
export const someProviderDefinition = {
  // ...settings/request/response adapter pieces
  generationParams: {
    id: 'some-provider.default',
    include: [
      'generationParam.size',
      'generationParam.rawJson',
      'generationParam.retryPolicy'
    ],
    byMode: {
      edit: ['generationParam.size', 'generationParam.inputFidelity']
    },
    modelRules: [
      {
        modelIdIncludes: ['fast-preview'],
        exclude: ['generationParam.quality']
      }
    ]
  }
};
```

Availability is applied in three places:

- parameter modal rendering: unsupported provider-profile params are not mounted;
- OpenAI-compatible payload serialization: hidden params do not contribute payload keys;
- request snapshot capture: provider-hidden params are not stored as sent request controls when the provider and mode are known.

Capability probe filtering still runs separately. Provider profile filtering answers “this adapter/model never exposes this parameter”; capability filtering answers “this provider endpoint rejected this parameter during probe”.

This deliberately stays code-owned instead of `JSON schema -> automatic form`. Image generation parameters usually need custom UX, custom copy, custom payload semantics and sometimes local-only behavior such as retries.
