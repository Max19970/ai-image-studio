---
name: image-studio-large-task-decomposition
description: Use when an Image Studio task is too large for one chat and should be split into staged follow-up work notes instead of starting implementation immediately.
---

# Image Studio large task decomposition

Use this skill when a requested Image Studio task is too broad, risky, or long for one chat.

First create a concise staged decomposition and put the follow-up notes under:

```txt
.codex/next-chat-prompts/
```

Each note should cover one stage of work and include:

- context;
- relevant worktree, roadmap, plan, or goal path;
- expected result;
- checks to run;
- boundaries of the stage;
- whether protocol, branch, visual QA, or Telegram reporting is expected.

Checklist marks:

```txt
- [ ] not started
- [~] in progress or partially done
- [x] done and verified
```

Final response after decomposition should report the file path and the recommended stage order.
