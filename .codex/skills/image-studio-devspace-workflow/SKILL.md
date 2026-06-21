---
name: image-studio-devspace-workflow
description: Use for any Image Studio work through DevSpace: source of truth, project inspection, editing discipline, checks, and final reporting.
---

# Image Studio DevSpace workflow

Use this skill for any work on the Image Studio project.

## Source of truth

The actual project files opened through DevSpace are the primary source of truth.
Do not implement from old archives, memory, or prior chat context when current files are available.

Default project root:

```txt
C:\Users\maxsh\Documents\Codex\image-studio
```

Priority of sources:

1. Current project files through DevSpace.
2. Fresh files Max explicitly uploaded in the current chat.
3. Project documents in ChatGPT Project Files.
4. Memory and previous conversation context.
5. Agent assumptions, only with an explicit caveat.

## Start of work

At the beginning of a project task:

1. Open the actual project folder through DevSpace.
2. Check relevant instructions and skills.
3. Inspect the current files that own the behavior being changed.
4. Check repository state before edits when the task changes files.
5. Avoid touching unrelated existing changes.

Do not create a separate copy unless the task protocol calls for a worktree or Max asks for one.

## Editing discipline

- Read the relevant code before changing it.
- Prefer small, grounded patches over broad rewrites.
- Fix causes, not only symptoms.
- Preserve current architecture unless deliberately refactoring.
- Do not move generated runtime/cache/log output into `.codex/`.
- Keep manually maintained agent materials inside `.codex/`.

## Checks

Always inspect `package.json` before assuming command names.

The usual minimum project check is:

```bash
npm run build
```

Use extra checks only when they exist and fit the task:

```bash
npm run lint
npm run typecheck
npm run test
npm run verify:visual
```

Report checks exactly as run. Do not write "verified" if a check was not actually run.

## Final report

A good final report is short and concrete:

- what changed;
- files changed;
- checks run and their results;
- what still needs manual review, if anything;
- any risks or blocked verification.
