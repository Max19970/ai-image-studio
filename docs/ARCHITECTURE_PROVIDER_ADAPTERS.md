# Provider adapter architecture

Image Studio treats image APIs as provider adapters. A provider adapter is the boundary between the shared app/runtime and the provider-specific request, response, auth, error, and capability-probe behavior.

## Server contract

Server adapters implement `ProviderAdapterDefinition` from `server/providers/types.ts`:

```ts
export interface ProviderAdapterDefinition {
  id: string;
  label: string;
  resolveEndpoint(provider, kind): string;
  fingerprint(provider): string;
  fetchGenerate(provider, payload): Promise<UpstreamRequestResult>;
  fetchEdit(provider, payload, files): Promise<UpstreamRequestResult>;
  quickCheck(provider): Promise<ProviderQuickCheckResult>;
  probe(provider): Promise<ProbeReport>;
}
```

The adapter owns provider-specific behavior. `server/index.ts` is only the bootstrap. HTTP routing lives in `server/routes/*`, shared HTTP helpers live in `server/http/*`, and provider-specific behavior stays inside provider packages.

## OpenAI-compatible server adapter

The OpenAI-compatible implementation is intentionally split by responsibility:

```text
server/providers/openai-compatible/
  adapter.ts          # composition only: exports ProviderAdapterDefinition
  auth.ts             # API key lookup, auth/custom headers
  endpoints.ts        # endpoint resolution and provider fingerprint
  errorNormalizer.ts  # upstream body/error message normalization
  fixtureImage.ts     # tiny PNG fixtures for probe requests
  multipartEdit.ts    # edit form construction and file validation
  probeSuite.ts       # quick check, baseline probes, parameter probes
  requestHandlers.ts  # generate/edit upstream request handlers
  upstreamClient.ts   # timeout, retry, fetch, request logging
```

`adapter.ts` should remain a small composition file. Do not add multipart, probe, PNG, fetch retry, or parsing logic back into it.

## Client contract

Client-side provider definitions live in `src/providers/<adapter-id>` and are registered through `src/entities/provider/registry.ts`.

The OpenAI-compatible client adapter currently contains:

```text
src/providers/openai-compatible/
  definition.ts       # visible provider metadata and defaults
  requestAdapter.ts   # local proxy request creation and payload warnings
  responseAdapter.ts  # JSON/SSE image extraction
```

The shared client runtime should ask the selected provider adapter to:

- build the local proxy request;
- validate provider-specific params where needed;
- explain provider-specific warnings;
- parse JSON and SSE responses.

It should not hardcode OpenAI-compatible response parsing in `src/infrastructure/api.ts`.

## Adding a future provider

Add a new provider as a package, not as conditionals spread across the app:

```text
server/providers/<adapter-id>/
  adapter.ts
  ...provider-specific modules

src/providers/<adapter-id>/
  definition.ts
  requestAdapter.ts
  responseAdapter.ts
```

Then register it in:

```text
server/providers/registry.ts
src/entities/provider/registry.ts
```

Adapter-specific UI should be exposed through the provider definition/settings schema and rendered by settings modules, not hardcoded into a single giant settings component.

## Checks

Provider adapter structure is checked by:

```bash
npm run providers:check
```

The check ensures the OpenAI-compatible adapter remains modular and that `adapter.ts` stays a composition file instead of regrowing into a provider monolith.
