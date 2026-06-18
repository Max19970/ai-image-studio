# Image Studio — workspace app composition

Stage 3 moved the workspace wiring out of `src/app/App.tsx` into `src/app/workspace`.

## Why this exists

`App.tsx` used to own nearly every piece of UI state, derived state, command wiring, and slot context construction. That made it hard to add new workspace surfaces without editing the central component.

The app shell is now split into smaller app-level modules:

```txt
src/app/workspace/
  types.ts
  useWorkspaceState.ts
  useWorkspaceDerivedState.ts
  useWorkspaceCommands.ts
  createWorkspaceContexts.ts
  useWorkspaceViewModel.ts
```

## Responsibilities

- `useWorkspaceState.ts` owns mutable workspace state and persistence side effects for settings, theme, image params, task history, modal state, batch composer state, selection state, and provider probe UI state.
- `useWorkspaceDerivedState.ts` computes active provider/model, payload, warnings, submit availability, selected task/image, batch warnings, and status text.
- `useWorkspaceCommands.ts` wires the existing app command modules to the workspace state and derived state.
- `createWorkspaceContexts.ts` builds the typed slot contexts consumed by `SlotHost`.
- `useWorkspaceViewModel.ts` composes state, derived state, commands, and contexts into one app-level view model.
- `App.tsx` now renders the detail route or workspace shell and passes typed contexts to slot hosts.

## Current boundary

This stage intentionally did not redesign command behavior, task lifecycle, provider behavior, or storage. The migration only moved responsibilities out of `App.tsx` while preserving the existing command contract.

Runtime provider smoke-testing still requires a configured provider/API key.
