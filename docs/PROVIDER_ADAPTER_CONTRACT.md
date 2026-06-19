# Provider Adapter Contract

This document records the provider boundary after Stage 10. The goal is to make new provider shapes possible without leaking provider-specific behavior into UI, workspace commands, or generation processes.

## Server adapter contract

A server adapter owns network behavior for one provider family. It must expose:

- `id` and `label` for registry/debug output;
- `resolveEndpoint(provider, kind)` for operation-specific endpoint resolution;
- `fingerprint(provider)` for probe/cache invalidation;
- `capabilities` for stable operation-level feature flags such as generate/edit support, attachment support, streaming, local workflow usage and live resources;
- `resources` for declaring adapter-owned provider resources such as checkpoints, LoRA, samplers or schedulers;
- optional `fetchResources(provider, kind)` for provider resources that are discovered at runtime;
- `fetchGenerate(provider, payload)` for JSON generation requests;
- `fetchEdit(provider, payload, files)` for multipart edit requests;
- `quickCheck(provider)` for a cheap provider connectivity check;
- `probe(provider)` for capability discovery;
- `settingsSchema` for adapter-owned server validation.

Server routes should select an adapter through the registry and call the contract. They should not know OpenAI-compatible endpoint paths, multipart field names, probe fixtures, auth headers, provider-specific retry/error rules, or how local provider resources are discovered.

## Client adapter contract

A client adapter owns UI-facing request/response semantics for one provider family. It must expose:

- adapter metadata: `id`, `label`, `description`, default endpoints, multipart support;
- `capabilities`, mirroring the server-side feature flags for UI decisions without provider-name checks;
- `resources`, the adapter-owned resource kinds that may be queried through the local server proxy;
- `generationSurface`, the adapter-owned generation parameter surface descriptor;
- `detailDescriptor`, the adapter-owned request detail descriptor used by future provider-specific detail pages;
- `controlSurface`, the adapter-owned declaration of composer/batch controls visible for this provider family;
- `settingsFields`, the adapter-specific settings schema used by settings UI and documentation;
- `capabilitiesFromProbe(report)` for converting probe reports into UI capabilities;
- `request` methods for size validation, payload building, warnings, raw JSON parsing, and submit proxy config;
- `response` methods for JSON/SSE image collection.

Workspace, composer, gallery, detail and settings screens should consume these adapter contracts rather than checking raw provider names or models, except for user-facing warnings intentionally owned by the adapter request layer.



## Provider resources

Provider resources are runtime-discovered lists owned by an adapter. Examples include ComfyUI checkpoints, LoRA files, samplers and schedulers. The browser must not call local provider servers directly. It should request resources through the local Express proxy route:

```txt
POST /api/provider/resources
  { provider, kind }
```

The route selects the server adapter through the registry and calls `fetchResources(provider, kind)` when the adapter supports it. Adapters without live resources should declare `resources.kinds: []` and omit `fetchResources`; the route returns a controlled unsupported error instead of leaking provider-specific branching into UI code.

## Generation surface and detail descriptor

`generationSurface` is the client adapter's declaration of who owns the parameter UI and payload semantics. OpenAI-compatible providers currently use `kind: 'logical-params'`, which maps to the existing generation parameter registry. A future ComfyUI adapter can use a provider-owned surface for checkpoint, LoRA and node-parameter tabs without adding every ComfyUI field to shared `ImageParams`.

`detailDescriptor` is the equivalent boundary for request details. OpenAI-compatible providers keep the existing request snapshot renderer. A future ComfyUI descriptor can render checkpoint, LoRA stack, sampler, scheduler, seed, workflow id and prompt id without hard-coding those fields in the detail page.

## Control surface

`controlSurface` is the client adapter boundary for composer actions. It declares whether the active provider family should show mode switching, image attachments, masks, LoRA registry quick controls, parameter access and batch transition.

Feature components should consume the resolved control surface through context. They should not branch on raw adapter IDs such as `comfyui`. Unsupported controls must be hidden at the UI level and guarded in hidden file input handlers, while the compatibility policy remains responsible for sanitizing already-existing request state.

Current surfaces:

- OpenAI-compatible: `api-image`, with generate/edit mode switching, image attachments, mask, parameters and batch.
- ComfyUI: `local-workflow`, with model picker, LoRA registry quick controls, parameters and batch; no OpenAI-style edit, image attachments or masks in the MVP.

## Adapter-specific settings

Provider-specific settings must be registered by the adapter, not hard-coded in unrelated UI layers.

Current OpenAI-compatible settings fields include:

- generation endpoint;
- edit endpoint;
- optional responses endpoint;
- API key;
- auth header name;
- auth scheme;
- custom headers JSON;
- timeout.

The server also registers a zod settings schema for the same adapter family. Future providers can tighten or extend validation through their own adapter settings schema.

## Fixture and contract tests

Stage 10 contract tests cover:

- client/server adapter id alignment;
- adapter settings field registration;
- server settings schema parsing;
- endpoint resolution and fingerprint changes;
- auth/custom headers;
- JSON generate request shape;
- multipart edit request shape;
- upstream error normalization;
- probe status classification;
- quick-check failure normalization.

These tests intentionally mock `fetch`. They do not require real API keys and do not perform network calls.

## Mock adapter candidate

A second real provider adapter should only be added when we need a genuinely different API shape. Until then, the documented mock adapter candidate is:

```txt
mock-fixture-provider
  generate: local JSON fixture response
  edit: local multipart fixture response
  quickCheck: deterministic success/failure switch
  probe: deterministic accepted/rejected capability matrix
```

This mock adapter would be useful for end-to-end UI tests, demo mode, and provider registry contract checks. It should live under `server/providers/mock-fixture-provider` and `src/providers/mock-fixture-provider`, not inside OpenAI-compatible modules.

## Non-goals for Stage 10

- Do not add a fake provider to production UI just to prove extensibility.
- Do not move provider settings UI into a generic dynamic form yet.
- Do not run live provider probes in automated tests.
- Do not special-case provider internals in app commands or feature screens.

## Generation parameter profile

Every client adapter definition must declare `generationParams: ProviderGenerationParamProfile`.

This profile is the adapter-owned allow/deny layer for generation parameter modules. It lets a provider expose a completely different parameter surface without changing the shared parameter modal manually.

The profile supports:

- `include: 'all' | string[]` as the base logical parameter set;
- optional `byMode.generate` / `byMode.edit` overrides;
- optional `exclude` list;
- optional `modelRules` keyed by `modelIdIncludes` for model-specific differences;
- optional `isAvailable(context)` for rare code-level decisions.

A future non-OpenAI adapter should add its own logical parameter modules, payload serializer, field placements and then include only those param ids in its provider profile. The checker and contract tests must fail if the profile is missing.
