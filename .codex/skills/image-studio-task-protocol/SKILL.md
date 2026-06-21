---
name: image-studio-task-protocol
description: Use for Image Studio implementation tasks unless Max explicitly disables the protocol; covers isolated worktrees, branches, Telegram progress, acceptance, and lifecycle.
---

# Image Studio task protocol

Use this skill for any task that changes the project, unless Max explicitly says to work without the protocol, directly on `main`, or without a separate plan/worktree.

If Max disables the protocol for a task, do not apply the branch/worktree/Telegram/lifecycle parts for that task. Still follow source-of-truth, safety, and verification rules from the DevSpace workflow skill.

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

## Long technical work notifications

During long technical tasks, send concise Telegram progress notifications when meaningful milestones happen: major findings, completed stages, important checks, blockers, or risk changes.

A progress notification should include:

1. Progress like `[current]/[total]` when the task has stages.
2. What has been found or confirmed.
3. What is being changed now.
4. Checks already run or planned next.
5. Risks, blockers, or ambiguity if present.

Do not spam on every small action.

At the end of technical work, before the final chat reply, send the same final summary through the Telegram bot MCP when the protocol is active.

## Final summary while protocol is active

The final answer should include:

1. What changed.
2. Changed files.
3. Checks actually run.
4. What still needs manual testing, if applicable.
5. A reminder that final push, merge, release, tag, or worktree cleanup requires explicit acceptance from Max.

## After explicit acceptance

When Max explicitly confirms that the update is fully accepted:

1. Push the work branch to GitHub.
2. Locally try merging the update branch into `main`.
3. If merge succeeds, make sure the project builds and has no conflicts.
4. Update the main checkout: switch to the main project folder, pull current `main`, and confirm it is fresh.
5. Start future tasks from fresh `main` and a new worktree.
6. Close the temporary worktree only after explicit acceptance and successful merge.

If merge conflicts, the build fails, or the main checkout cannot be safely updated, stop and explain the problem to Max. Do not force a merge.
