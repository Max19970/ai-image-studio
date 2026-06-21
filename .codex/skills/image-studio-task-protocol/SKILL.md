---
name: image-studio-task-protocol
description: Use for Image Studio implementation tasks unless Max explicitly disables the protocol; covers isolated worktrees, branches, Telegram progress, acceptance, and lifecycle.
---

# Image Studio task protocol

Use this skill for any task that changes the project, unless Max explicitly says to work without the protocol, directly on `main`, or without a separate plan/worktree.

If Max disables the protocol for a task, do not apply the branch/worktree/planning/lifecycle parts for that task. Still follow source-of-truth, safety, verification, and Telegram-notification rules from `AGENTS.md`.

## Isolated branch workspace

Default rule: one task or one connected set of changes = one separate worktree = one branch.

The goal is not merely switching branches in the main checkout. The goal is a physically separate working directory so several chats can work in parallel.

Preferred method: Git worktree.

Create new worktrees next to the main project directory, on the same folder level as `image-studio`, not inside it and not in temporary directories.
Recommended folder format:

```txt
image-studio-<short-task-id>
```

Before changing files:

1. Check repository state.
2. Make sure the work is not being done on top of someone else's unfinished changes.
3. Create a separate worktree from current `main`.
4. Create or open a branch for the task.
5. Use a meaningful branch name, for example `feature/settings-header-panel` or `fix/composer-prompt-scroll`.
6. Read, edit, build, and test inside that task worktree until the update is accepted and merged.

If the main checkout already contains unfinished changes from Max or another branch, do not touch them without explicit permission.

If worktree creation is blocked by tooling, say so explicitly and continue only when the main checkout is clean and the change is small/safe, or ask Max how to proceed.

## Telegram notifications

Telegram notifications are mandatory for technical Image Studio work that changes files, runs implementation checks, performs long investigation, or spans multiple meaningful steps.

Minimum required behavior:

1. Send a progress message after the first meaningful finding or when edits/checks begin.
2. Send the final summary through Telegram before the final chat reply.

For long tasks, also notify after major milestones, important findings, blockers, or risk changes.

A progress notification should include:

1. Progress like `[current]/[total]` when the task has stages.
2. What has been found or confirmed.
3. What is being changed now.
4. Checks already run or planned next.
5. Risks, blockers, or ambiguity if present.

Do not spam on every small action.

Important: `без протокола`, `без плана`, or `можно на main` disables only branch/worktree/planning parts. It does not disable Telegram notifications. Skip Telegram only if Max explicitly says not to notify in Telegram / не писать в Telegram.

If Telegram tooling is unavailable, mention that in the final chat summary.

## Final summary

The final answer should include:

1. What changed.
2. Changed files.
3. Checks actually run.
4. What still needs manual testing, if applicable.
5. Whether Telegram notification was sent.
6. Whether final push, merge, release, tag, or worktree cleanup still requires explicit acceptance from Max.

## After explicit acceptance

When Max explicitly confirms that the update is fully accepted:

1. Push the work branch to GitHub.
2. Locally try merging the update branch into `main`.
3. If merge succeeds, make sure the project builds and has no conflicts.
4. Update the main checkout: switch to the main project folder, pull current `main`, and confirm it is fresh.
5. Start future tasks from fresh `main` and a new worktree.
6. Close the temporary worktree only after explicit acceptance and successful merge.

If merge conflicts, the build fails, or the main checkout cannot be safely updated, stop and explain the problem to Max. Do not force a merge.
