---
name: devspace-background-bash
description: Use during DevSpace work when a shell command may take longer than 1 second; keep output in ./dev-only/generated/tmp and watch the log instead of blocking the session.
---

# DevSpace command logging

For DevSpace work, any shell command expected to take longer than 1 second must be launched asynchronously, with stdout and stderr written to a timestamped log in `./dev-only/generated/tmp`.

Monitor progress by reading that log. Do not run such commands in a blocking foreground mode just to wait for completion.

For short commands expected to complete within 1 second, normal foreground execution is fine.

Always report the log path for long commands, and verify completion from the log/status before calling the command successful.
