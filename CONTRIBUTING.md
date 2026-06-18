# Contributing

Contributions are welcome. Image Studio is intentionally local-first, modular, and conservative about secrets.

## Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

## Before opening a pull request

Run the static release gate:

```bash
npm run verify:static
```

For UI/layout changes, also run the visual smoke gate and inspect the screenshots manually:

```bash
npm run verify:visual
```

`verify:visual` is not a pixel-diff system. It creates a stable set of desktop/mobile screenshots and validates that the artifacts exist; visual judgement stays human.

## Architecture rules

- Do not recreate `src/components` as a catch-all layer.
- Put reusable primitives in `src/shared/ui`.
- Put feature-specific UI in the owning `src/features/<feature>` folder.
- Add reusable interface elements as definitions and place them through `src/interface/placements`.
- Add generation parameters as self-contained modules under `src/entities/generation-params/fields/<param>`.
- Add provider-specific behavior through provider adapters, not by branching inside the app shell or settings screen.
- Keep processes free of React/UI dependencies.
- Keep `src/styles/global.css` import-only; scoped styles should live next to their owner module.

The boundary checker enforces the most important rules:

```bash
npm run arch:check:strict
```

## Pull request style

- Prefer small, focused changes.
- Mention which verification commands you ran.
- Include screenshots or a contact sheet for visible UI changes.
- Update docs when changing architecture, public commands, environment variables, or storage/provider behavior.

## Safety

Do not commit:

- `.env` files;
- real provider keys;
- local SQLite databases;
- `data/`;
- `storage.key`;
- generated `artifacts/`;
- private/generated images that should not be public.

The secret scanner runs as part of `verify:static`, but it is only a safety net. Review your changes before publishing.
