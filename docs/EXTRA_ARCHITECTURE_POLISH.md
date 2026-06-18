# Extra architecture polish

Status: completed, 2026-06-18.

This pass closed the non-blocking architecture tails from the final code audit without adding mock providers or changing product behavior.

## Scope

- Split the server bootstrap from route registration.
- Split high fan-in domain type contracts into focused modules.
- Split high fan-in workspace context contracts into focused modules.
- Harden storage codec JSON boundaries from `any` to explicit `unknown`-based JSON objects.
- Keep all release gates green.

## Server split

`server/index.ts` is now a thin bootstrap:

```txt
server/index.ts
  create app, register static client, listen

server/app.ts
  create Express app, register middleware and API routes

server/http/
  CORS, error/proxy response helpers, static client fallback

server/routes/
  generation, provider, generation-task storage, app-document storage, defaults
```

Provider-specific behavior still stays inside `server/providers/*`; storage behavior still stays inside `server/storage/*`.

## Domain contract split

`src/domain/types.ts` remains as a compatibility barrel, but active consumers now import focused contracts directly:

```txt
workMode.ts
imageParams.ts
providerSettings.ts
studioSettings.ts
generationTask.ts
providerProbe.ts
apiTypes.ts
```

This keeps shared concepts available without letting one file become a growing type dumping ground.

## Workspace context split

`src/interface/context/workspace.ts` remains as a compatibility barrel, but active consumers now import focused context contracts directly:

```txt
workspace/tabs.ts
workspace/gallery.ts
workspace/detail.ts
workspace/settings.ts
workspace/sidebar.ts
workspace/batchComposer.ts
workspace/info.ts
workspace/main.ts
workspace/composerDock.ts
```

This keeps SlotHost context types owner-oriented and makes future context growth easier to review.

## Storage JSON boundary

Storage codec functions now use:

```ts
JsonObject = Record<string, unknown>
```

instead of `Record<string, any>`. Unknown encrypted JSON is still handled at the persistence boundary, but decode helpers now make that boundary explicit and safer under TypeScript strict mode.

## Verification

```txt
npm run release:check
npm run storage:benchmark -- --tasks=80 --images=2 --batch-items=1 --batch-images=1 --image-bytes=2048
```

Both passed during the polish pass.
