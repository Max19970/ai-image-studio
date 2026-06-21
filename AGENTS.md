# Image Studio — AGENTS.md

This file is the short entry point for agents working on **Image Studio**.
Detailed operational rules live in local Codex skills under `.codex/skills/`.

## Core project facts

- Main project root on Max's machine:

  ```txt
  C:\Users\maxsh\Documents\Codex\image-studio
  ```

- Work with the actual project through **DevSpace**. Current files in DevSpace are the source of truth.
- Do not treat old archives, older chat context, or memory as authoritative when DevSpace access is available.
- Do not commit, push, merge, tag, release, or clean up worktrees unless Max explicitly asks.
- If Max explicitly disables the normal protocol for a task, follow that instruction for the task, but still preserve source-of-truth, safety, and verification rules.

## Agent-side project files

The project `.codex/` directory is reserved for manually maintained agent materials and confirmed Codex-compatible assets: local skills, agent instructions, workflow notes, DevSpace/MCP notes, and next-chat prompts.

Do not move generated runtime/cache/log directories into `.codex/`. For example, `.playwright-cli/` is tool output/state, not an installed agent instruction or skill.

Do not create new manually maintained agent folders outside `.codex/`, including `.agents/` or standalone agent documents in `docs/`. The root `AGENTS.md` is the only exception because it is the agent entry point.

## Skill router

Before acting, read the skills that match the task. If several apply, read the general workflow skill first, then the more specific ones.

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

## Non-negotiables

- Read relevant project files before changing code. Do not implement from memory.
- Preserve existing user/agent changes unless Max explicitly allows replacing them.
- Before reporting success, run relevant checks and state exactly what was run.
- For UI changes, do visual QA when possible and state the scenarios/viewports checked.
- Never claim something was verified if it was not actually checked.
