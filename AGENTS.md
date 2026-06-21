# Image Studio — AGENTS.md

This file is the mandatory entry point for agents working on **Image Studio**.
It intentionally contains the critical rules directly. Local Codex skills under `.codex/skills/` contain the longer explanations, but they do not replace this file.

## Core project facts

- Main project root on Max's machine:

  ```txt
  C:\Users\maxsh\Documents\Codex\image-studio
  ```

- Work with the actual project through **DevSpace**. Current files in DevSpace are the source of truth.
- Do not treat old archives, older chat context, or memory as authoritative when DevSpace access is available.
- Do not commit, push, merge, tag, release, or clean up worktrees unless Max explicitly asks.

## Mandatory startup sequence

For every Image Studio task:

1. Read this `AGENTS.md`.
2. Open the real project through DevSpace.
3. Check `git status --short --branch` before edits.
4. Read every local skill that matches the task before acting.
5. If a required skill cannot be read, stop and tell Max instead of continuing from memory.
6. Read relevant project files before changing them.
7. After edits, review the diff/status and run relevant checks.

Do not skip matching skills just because this file contains a short summary. The summary is not a substitute for the full skill.

## Mandatory skill loading

Read skills in this order when they apply:

1. `.codex/skills/image-studio-devspace-workflow/SKILL.md` — always for Image Studio project work.
2. `.codex/skills/devspace-background-bash/SKILL.md` — before any DevSpace shell command that may take longer than 1 second.
3. `.codex/skills/image-studio-task-protocol/SKILL.md` — for any task that changes project files, unless Max explicitly disables the protocol.
4. More specific skills by task type:
   - `.codex/skills/image-studio-large-task-decomposition/SKILL.md` — work too large for one chat.
   - `.codex/skills/image-studio-architecture/SKILL.md` — architecture, refactoring, modularization, technical debt, roadmap work.
   - `.codex/skills/image-studio-generation-rules/SKILL.md` — providers, models, generation runners, batch/multi generation, attachments, LoRA, prompt composer behavior.
   - `.codex/skills/image-studio-ui-visual-qa/SKILL.md` — UI, UX, layout, theme, animation, mobile, screenshots, visual QA.
   - `.codex/skills/dev-image-cli/SKILL.md` — generated image fixtures, visual examples, datasets, or development image outputs.

If several skills apply, read all of them. Do not rely only on the skill router table.

## Protocol defaults

For project-changing tasks, the normal task protocol is active by default:

- one task = one separate worktree = one branch;
- do not modify `main` directly unless Max explicitly asks to work on `main`, disables the protocol, or the task is strictly about maintaining agent instructions and Max accepts direct edits;
- do not work on top of unrelated unfinished changes;
- do not push/merge/release/tag/cleanup without explicit permission.

If DevSpace or another tool blocks creating a worktree, say so clearly and continue only if the main checkout is clean and the change is small/safe, or ask Max how to proceed.

## Telegram notifications are mandatory for technical project work

For any technical Image Studio work that changes files, runs implementation checks, performs long investigation, or spans multiple meaningful steps, notify Max through Telegram.

Minimum rule:

- send a Telegram progress note after the first meaningful finding or when edits/checks begin;
- send the final summary to Telegram before the final chat reply.

For long tasks, also send progress updates after major stages, important findings, blockers, or risk changes.

Do not spam on every tiny action.

Important: `без протокола`, `без плана`, or `можно на main` disables only the branch/worktree/planning parts. It does **not** disable Telegram notifications. Skip Telegram only if Max explicitly says not to notify in Telegram / не писать в Telegram.

If Telegram tooling is unavailable, mention that explicitly in the chat final summary.

## Agent-side project files

The project `.codex/` directory is reserved for manually maintained agent materials and confirmed Codex-compatible assets: local skills, agent instructions, workflow notes, DevSpace/MCP notes, and next-chat prompts.

Do not move generated runtime/cache/log directories into `.codex/`. For example, `.playwright-cli/` is tool output/state, not an installed agent instruction or skill.

Do not create new manually maintained agent folders outside `.codex/`, including `.agents/` or standalone agent documents in `docs/`. The root `AGENTS.md` is the only exception because it is the agent entry point.

## Source-of-truth and verification rules

- Current project files through DevSpace are the source of truth.
- Preserve existing user/agent changes unless Max explicitly allows replacing them.
- Fix causes, not only symptoms.
- Before reporting success, run relevant checks and state exactly what was run.
- For UI changes, do visual QA when possible and state scenarios/viewports checked.
- Never claim something was verified if it was not actually checked.

## Skill router reference

| Skill | When to use |
| --- | --- |
| `.codex/skills/image-studio-devspace-workflow/SKILL.md` | Any Image Studio work through DevSpace: reading files, editing, checking, reporting, handling source-of-truth. |
| `.codex/skills/devspace-background-bash/SKILL.md` | Any DevSpace shell command that may take longer than 1 second. Run it in background-log mode. |
| `.codex/skills/image-studio-task-protocol/SKILL.md` | Any implementation/change task unless Max explicitly disables the protocol. Covers branch/worktree, Telegram, acceptance, and lifecycle rules. |
| `.codex/skills/image-studio-large-task-decomposition/SKILL.md` | When the task is too large for one chat and should be split into follow-up work notes. |
| `.codex/skills/image-studio-architecture/SKILL.md` | Architecture, refactoring, modularization, ownership boundaries, technical debt, or roadmap work. |
| `.codex/skills/image-studio-generation-rules/SKILL.md` | Provider/model/generation runner work, batch/multi generation, attachments, LoRA, prompt textarea behavior. |
| `.codex/skills/image-studio-ui-visual-qa/SKILL.md` | UI/UX/layout/theme/mobile changes or any task requiring visual QA and screenshots. |
| `.codex/skills/dev-image-cli/SKILL.md` | Development tasks that need generated image files, fixtures, visual examples, datasets, or implementation testing through the local image CLI. |
