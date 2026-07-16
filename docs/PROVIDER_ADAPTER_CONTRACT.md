# Provider Adapter Contract

This document defines the Image Studio provider manifest boundary.

## Server adapter contract

A server provider adapter owns request execution, endpoint validation, provider resources, optional `fetchResources`, capability probing, and an adapter-specific settings schema. The server manifest id must match the adapter id.

## Client adapter contract

A client provider adapter owns user-facing settings fields, runtime capabilities, response parsing, payload warnings, generation parameter profile, generation surface, detail descriptor, control surface, and provider manifest metadata. The client manifest id must match the client definition id.

## Adapter-specific settings

Provider-specific settings belong to provider-owned schemas and panels. Generic settings code should consume a narrow settings port instead of branching on concrete provider ids.

## Generation parameter profile

Each provider declares a generation parameter profile that says which logical params are available globally, by work mode, and by model rule. Adding a provider must not require editing the logical param registry.

## Mock adapter candidate

A mock adapter candidate should be installable by adding server/client manifest modules plus request/response/settings implementations. The core app should discover the provider manifest without central import-list edits.

## Provider resources

Provider resources are listed by provider-owned descriptors and can include live resources such as checkpoints, LoRAs, samplers, schedulers, or future resource kinds.

## Generation surface

A generation surface is the provider-facing parameter UI/payload boundary. Logical API providers can reuse the logical surface; local workflow providers can register provider-owned surfaces.

## Detail descriptor

A detail descriptor controls how saved snapshots are rendered for provider-owned payloads. It should be registered through the provider manifest rather than selected by feature-level `if providerId` checks.

## Provider manifest

The provider manifest is the composition root for one provider. It references the definition and architecture checks and is discovered by the frontend registry.
