# Prompt vertical scroll bugfix report

Date: 2026-06-19

## Problem

After the focus-expand prompt update, long prompt text could still behave as a horizontal-scrolling line in prompt fields. The expected behavior is:

- prompt text wraps inside the field;
- long content scrolls vertically when focused and capped by the 5-7 / 4-6 row limit;
- horizontal scrolling is disabled;
- behavior is identical for the regular composer and batch composer, on desktop and mobile.

## Changes

- `src/shared/hooks/useAutosizedTextarea.ts`
  - `calculateAutosizedTextareaLayout(...)` now returns `overflowX: 'hidden'` as part of the shared textarea layout contract.
  - `useAutosizedTextarea(...)` applies `overflowX` from that shared layout instead of switching collapsed fields back to `auto`.

- `src/features/composer/sections/prompt/ComposerPromptSection.tsx`
  - prompt textarea now always uses `wrap="soft"`.

- `src/features/batch-composer/sections/draft-prompt/BatchDraftPromptSection.tsx`
  - batch prompt textarea now always uses `wrap="soft"`.

- `src/features/composer/ComposerLayout.module.css`
- `src/features/batch-composer/sections/draft-prompt/BatchDraftPromptSection.module.css`
  - prompt textarea now explicitly uses:
    - `overflow-x: hidden`;
    - `white-space: pre-wrap`;
    - `overflow-wrap: anywhere`.
  - collapsed/focused prompt states now share the same wrapping behavior; only height and vertical overflow differ.

- `tests/autosized-textarea.test.ts`
  - autosize unit tests now assert that `overflowX` remains hidden for collapsed, focused-min and focused-scroll layouts.

## Verification

Passed:

- `npm test` — 58/58
- `npm run verify:static`
- `npm run build`
- targeted screenshot capture:
  - `composer-long-prompt`
  - `batch-composer`
  - desktop + mobile
- focused browser smoke check:
  - regular composer focused prompt, desktop + mobile
  - batch composer focused prompt, desktop + mobile

Focused smoke check assertions:

- `wrap === "soft"`
- computed `overflow-x === "hidden"`
- inline autosize `overflowX === "hidden"`
- computed `white-space === "pre-wrap"`
- `scrollHeight > clientHeight`, confirming vertical scroll potential for long prompts
- `scrollWidth === clientWidth` in all checked cases

## Notes

Real generation requests were not sent during this bugfix verification.
Chromium policy was temporarily relaxed for local screenshot capture and restored after the checks.
