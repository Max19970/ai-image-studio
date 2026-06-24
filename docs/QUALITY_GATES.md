# Quality gates

Image Studio is a local-first tool, but changes should still pass a small set of checks before being merged.

## Required local checks

```bash
npm ci
npm run build
```

`npm run build` currently runs TypeScript without emit and then creates the Vite production build.

## Recommended review checklist

- The app still starts with `npm run dev`.
- The Express proxy still binds to `127.0.0.1` by default.
- No `.env`, generated images, SQLite databases, or storage keys are committed.
- API keys are not logged or exposed in screenshots.
- Provider changes are tested with quick check before full probe.
- UI changes are checked in both Russian and English locales.
- Theme changes are checked for readable contrast and reduced-motion behavior.

## Future automation

A GitHub Actions workflow should eventually run:

```bash
npm ci
npm run build
```

on pull requests and pushes to `main`.

This document exists first so the repository has an explicit quality bar before the automated workflow is added.
